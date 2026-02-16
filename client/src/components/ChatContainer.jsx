import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { IoCheckmarkDone, IoCheckmark } from "react-icons/io5"; // Import icons

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // Typing state
  const scrollRef = useRef();

  // Fetch chat history from DB
  useEffect(() => {
    async function fetchMessages() {
      if (currentChat) {
        const data = await JSON.parse(
          sessionStorage.getItem("chat-app-user")
        );
        const response = await axios.post(recieveMessageRoute, {
          from: data._id,
          to: currentChat._id,
        });
        setMessages(response.data);
      }
    }
    fetchMessages();
  }, [currentChat]);

  // Handle Fetch Current User for referencing
  useEffect(() => {
    const getCurrentChat = async () => {
      if (currentChat) {
        await JSON.parse(sessionStorage.getItem("chat-app-user"))._id;
      }
    };
    getCurrentChat();
  }, [currentChat]);

  // Send Message Handler
  const handleSendMsg = async (msg) => {
    const data = await JSON.parse(
      sessionStorage.getItem("chat-app-user")
    );
    
    // Stop typing before sending
    socket.current.emit("stop-typing", {
      to: currentChat._id,
      from: data._id
    });

    // 1. Send to socket server (Real-time)
    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: data._id,
      msg,
    });

    // 2. Save to database
    await axios.post(sendMessageRoute, {
      from: data._id,
      to: currentChat._id,
      message: msg,
    });

    // 3. Update local state immediately (default read: false)
    const msgs = [...messages];
    msgs.push({ fromSelf: true, message: msg, read: false });
    setMessages(msgs);
  };

  // Helper to handle typing events from Input
  const handleTyping = async (typing) => {
    const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
    if (typing) {
      socket.current.emit("typing", { to: currentChat._id, from: data._id });
    } else {
      socket.current.emit("stop-typing", { to: currentChat._id, from: data._id });
    }
  }

  // Listen for incoming messages & events from Socket
  useEffect(() => {
    if (socket.current) {
      // Message Received
      socket.current.on("msg-recieve", (msg) => {
        setArrivalMessage({ fromSelf: false, message: msg, read: false });
        // If we are looking at this chat, tell sender we read it
        const user = JSON.parse(sessionStorage.getItem("chat-app-user"));
        socket.current.emit("msg-read", { to: currentChat._id, from: user._id });
      });

      // Typing Events
      socket.current.on("typing-recieve", () => setIsTyping(true));
      socket.current.on("stop-typing-recieve", () => setIsTyping(false));

      // Read Receipt Event
      socket.current.on("msg-read-recieve", () => {
         // Update all local messages to be 'read'
         setMessages((prev) => 
            prev.map(msg => msg.fromSelf ? { ...msg, read: true } : msg)
         );
      });
    }
  }, [currentChat]); // Re-attach listeners if chat changes

  // Update messages list when arrivalMessage changes
  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img
              src={`data:image/svg+xml;base64,${currentChat.avatarImage}`}
              alt=""
            />
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
            {isTyping && <span className="typing-status">typing...</span>}
          </div>
        </div>
        <Logout />
      </div>
      <div className="chat-messages">
        {messages.map((message) => {
          return (
            <div ref={scrollRef} key={uuidv4()}>
              <div
                className={`message ${
                  message.fromSelf ? "sended" : "recieved"
                }`}
              >
                <div className="content">
                  <p>{message.message}</p>
                  
                  {/* Status Ticks Logic (Only for Sent messages) */}
                  {message.fromSelf && (
                    <div className="status-ticks">
                      {message.read ? (
                         <IoCheckmarkDone className="icon-read" /> // Blue ticks
                      ) : (
                         <IoCheckmark className="icon-sent" /> // Grey tick
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Bubble Animation */}
        {isTyping && (
             <div className="message recieved" ref={scrollRef}>
                <div className="content typing-bubble">
                   <div className="dot"></div>
                   <div className="dot"></div>
                   <div className="dot"></div>
                </div>
             </div>
        )}
      </div>
      
      {/* Pass handleTyping to Input */}
      <ChatInput handleSendMsg={handleSendMsg} handleTyping={handleTyping} />
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .avatar {
        img {
          height: 3rem;
        }
      }
      .username {
        h3 {
          color: white;
        }
        .typing-status {
            color: #00ff00;
            font-size: 0.8rem;
            margin-left: 10px;
            font-weight: bold;
            animation: pulse 1s infinite;
        }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        display: flex; 
        flex-direction: column; /* Stacks text and ticks vertically */
        
        .status-ticks {
            display: flex;
            justify-content: flex-end;
            margin-top: 5px;
            font-size: 1.2rem;
            .icon-read {
                color: #4fc3f7; /* WhatsApp Blue */
            }
            .icon-sent {
                color: #grey;
            }
        }

        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: #4f04ff21;
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #9900ff20;
      }
    }

    /* Typing Bubble CSS */
    .typing-bubble {
        display: flex;
        flex-direction: row !important;
        gap: 5px;
        padding: 15px !important;
        min-width: 60px;
        align-items: center;
        justify-content: center;
        
        .dot {
            width: 8px;
            height: 8px;
            background: #b3b3b3;
            border-radius: 50%;
            animation: bounce 1.5s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
    }
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }
    @keyframes pulse {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
    }
  }
`;