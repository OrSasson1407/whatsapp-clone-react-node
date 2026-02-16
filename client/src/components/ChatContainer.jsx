import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { IoCheckmarkDone, IoCheckmark } from "react-icons/io5"; // For status ticks

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // Tracks if the friend is typing
  const scrollRef = useRef();

  // 1. Fetch Chat History and Notify Server of Read Status
  useEffect(() => {
    async function fetchMessages() {
      if (currentChat) {
        const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
        const response = await axios.post(recieveMessageRoute, {
          from: data._id,
          to: currentChat._id,
        });
        setMessages(response.data);

        // When opening the chat, notify the sender that existing messages are read
        socket.current.emit("msg-read", {
          to: currentChat._id,
          from: data._id,
        });
      }
    }
    fetchMessages();
  }, [currentChat]);

  // 2. Handle Sending Messages (Supports text and multimedia)
  const handleSendMsg = async (msg, fileData = null) => {
    const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
    
    // Stop typing status on server before sending
    socket.current.emit("stop-typing", {
      to: currentChat._id,
      from: data._id,
    });

    const messagePayload = {
      to: currentChat._id,
      from: data._id,
      msg: fileData ? "" : msg,
      fileUrl: fileData?.url || null,
      messageType: fileData ? "image" : "text",
    };

    // Real-time emit
    socket.current.emit("send-msg", messagePayload);

    // Save to DB
    await axios.post(sendMessageRoute, messagePayload);

    // Update local UI immediately with timestamp and status
    const msgs = [...messages];
    msgs.push({ 
      fromSelf: true, 
      message: messagePayload.msg,
      fileUrl: messagePayload.fileUrl,
      messageType: messagePayload.messageType,
      read: false, 
      createdAt: new Date() 
    });
    setMessages(msgs);
  };

  // 3. Handle Typing logic from Input component
  const handleTyping = (typing) => {
    const data = JSON.parse(sessionStorage.getItem("chat-app-user"));
    if (typing) {
      socket.current.emit("typing", { to: currentChat._id, from: data._id });
    } else {
      socket.current.emit("stop-typing", { to: currentChat._id, from: data._id });
    }
  };

  // 4. Socket Listeners for Real-time Events
  useEffect(() => {
    if (socket.current) {
      // Receive Message
      socket.current.on("msg-recieve", (data) => {
        setArrivalMessage({ 
          fromSelf: false, 
          message: data.msg, 
          fileUrl: data.fileUrl, 
          messageType: data.messageType 
        });
        
        // Auto-read if the chat is currently open
        const user = JSON.parse(sessionStorage.getItem("chat-app-user"));
        socket.current.emit("msg-read", { to: currentChat._id, from: user._id });
      });

      // Typing Indicators
      socket.current.on("typing-recieve", () => setIsTyping(true));
      socket.current.on("stop-typing-recieve", () => setIsTyping(false));

      // Read Receipts (When the friend reads YOUR message)
      socket.current.on("msg-read-recieve", () => {
        setMessages((prev) => 
          prev.map((m) => (m.fromSelf ? { ...m, read: true } : m))
        );
      });
    }
  }, [currentChat]);

  // 5. Arrival Message Sync
  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  // 6. Auto-scroll to bottom
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
              alt="avatar"
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
              <div className={`message ${message.fromSelf ? "sended" : "recieved"}`}>
                <div className="content">
                  {message.messageType === "image" ? (
                    <img src={message.fileUrl} alt="sent-file" className="sent-img" />
                  ) : (
                    <p>{message.message}</p>
                  )}
                  
                  <div className="meta">
                    <span className="time">
                      {new Date(message.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {message.fromSelf && (
                      <div className="status-ticks">
                        {message.read ? (
                           <IoCheckmarkDone className="icon-read" />
                        ) : (
                           <IoCheckmark className="icon-sent" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing Animation Bubble */}
        {isTyping && (
          <div className="message recieved">
            <div className="content typing-bubble">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}
      </div>
      
      <ChatInput handleSendMsg={handleSendMsg} handleTyping={handleTyping} />
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  background-color: #131324;
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
      .avatar img { height: 3rem; }
      .username {
        h3 { color: white; }
        .typing-status {
            color: #00ff00;
            font-size: 0.8rem;
            margin-left: 10px;
            font-weight: bold;
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
      &-thumb { background-color: #ffffff39; width: 0.1rem; border-radius: 1rem; }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 45%;
        overflow-wrap: break-word;
        padding: 0.8rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        display: flex;
        flex-direction: column;
        .sent-img { max-width: 100%; border-radius: 0.5rem; margin-bottom: 5px; }
        .meta {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 5px;
            margin-top: 4px;
            .time { font-size: 0.65rem; color: #a1a1a1; }
            .status-ticks {
                font-size: 1rem;
                .icon-read { color: #4fc3f7; }
                .icon-sent { color: #888; }
            }
        }
      }
    }
    .sended { justify-content: flex-end; .content { background-color: #4f04ff21; } }
    .recieved { justify-content: flex-start; .content { background-color: #9900ff20; } }
    .typing-bubble {
        display: flex; flex-direction: row !important; gap: 4px; padding: 12px !important;
        .dot { width: 6px; height: 6px; background: #b3b3b3; border-radius: 50%; animation: bounce 1.4s infinite; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
    }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  }
`;