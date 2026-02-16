import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { IoCheckmarkDone, IoCheckmark, IoTrashOutline } from "react-icons/io5";

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef();

  // 1. Fetch History and notify read status
  useEffect(() => {
    async function fetchMessages() {
      if (currentChat) {
        const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
        const response = await axios.post(recieveMessageRoute, {
          from: data._id,
          to: currentChat._id,
          groupId: currentChat.isGroup ? currentChat._id : null,
        });
        setMessages(response.data);
        
        if (!currentChat.isGroup) {
          socket.current.emit("msg-read", { to: currentChat._id, from: data._id });
        }
      }
    }
    fetchMessages();
  }, [currentChat]);

  // 2. Handle Sending (Merged Text and Audio)
  const handleSendMsg = async (content, type = "text") => {
    const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
    
    const payload = {
      from: data._id,
      to: currentChat._id,
      message: type === "text" ? content : null,
      audioUrl: type === "audio" ? content : null,
      messageType: type,
      groupId: currentChat.isGroup ? currentChat._id : null,
    };

    socket.current.emit("send-msg", payload);
    const res = await axios.post(sendMessageRoute, payload);

    setMessages([...messages, { 
      _id: res.data.data?._id || uuidv4(),
      fromSelf: true, 
      message: { text: content, audioUrl: type === "audio" ? content : null },
      messageType: type,
      read: false,
      createdAt: new Date() 
    }]);
  };

  // 3. Handle Message Deletion (Delete for Everyone)
  const handleDeleteMsg = async (messageId) => {
    try {
      // In a real app, you would define host in APIRoutes
      const host = "http://localhost:5000"; 
      await axios.post(`${host}/api/messages/delete`, { messageId });
      
      socket.current.emit("delete-msg", { 
        to: currentChat._id, 
        messageId, 
        groupId: currentChat.isGroup ? currentChat._id : null 
      });
      
      setMessages((prev) => 
        prev.map((m) => m._id === messageId ? { ...m, deleted: true, message: { text: "This message was deleted" } } : m)
      );
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  const handleTyping = (typing) => {
    const data = JSON.parse(sessionStorage.getItem("chat-app-user"));
    socket.current.emit(typing ? "typing" : "stop-typing", { 
      to: currentChat._id, 
      from: data._id 
    });
  };

  // 4. Listen for Socket Events
  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-recieve", (data) => {
        setArrivalMessage({ 
          fromSelf: false, 
          message: data.msg, 
          messageType: data.messageType || "text",
          createdAt: new Date() 
        });
        const user = JSON.parse(sessionStorage.getItem("chat-app-user"));
        socket.current.emit("msg-read", { to: currentChat._id, from: user._id });
      });

      socket.current.on("msg-delete-recieve", (messageId) => {
        setMessages((prev) => 
          prev.map((m) => m._id === messageId ? { ...m, deleted: true, message: { text: "This message was deleted" } } : m)
        );
      });

      socket.current.on("typing-recieve", () => setIsTyping(true));
      socket.current.on("stop-typing-recieve", () => setIsTyping(false));

      socket.current.on("msg-read-recieve", () => {
        setMessages((prev) => prev.map((m) => (m.fromSelf ? { ...m, read: true } : m)));
      });
    }
  }, [currentChat]);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img src={`data:image/svg+xml;base64,${currentChat.avatarImage}`} alt="" />
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
                  {message.deleted ? (
                    <p className="deleted-text"><i>This message was deleted</i></p>
                  ) : message.messageType === "audio" ? (
                    <audio controls src={message.message.audioUrl} />
                  ) : (
                    <p>{message.message.text}</p>
                  )}
                  <div className="meta">
                    {message.fromSelf && !message.deleted && (
                      <IoTrashOutline className="del-btn" onClick={() => handleDeleteMsg(message._id)} />
                    )}
                    <span className="time">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.fromSelf && (
                      <div className="status-ticks">
                        {message.read ? <IoCheckmarkDone className="blue" /> : <IoCheckmark />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="message recieved">
            <div className="content typing-bubble">
              <div className="dot"></div><div className="dot"></div><div className="dot"></div>
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
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .username {
        h3 { color: white; }
        .typing-status { color: #00ff00; font-size: 0.8rem; margin-left: 10px; }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 45%;
        padding: 0.8rem;
        border-radius: 1rem;
        color: #d1d1d1;
        audio { max-width: 100%; height: 30px; }
        .meta {
          display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 5px;
          .del-btn { color: #ff4b4b; cursor: pointer; font-size: 1.1rem; }
          .time { font-size: 0.7rem; color: #a1a1a1; }
          .status-ticks { font-size: 1rem; .blue { color: #4fc3f7; } }
        }
      }
    }
    .sended { justify-content: flex-end; .content { background-color: #4f04ff21; } }
    .recieved { justify-content: flex-start; .content { background-color: #9900ff20; } }
    .typing-bubble {
        display: flex; gap: 4px; padding: 12px !important;
        .dot { width: 6px; height: 6px; background: #b3b3b3; border-radius: 50%; animation: bounce 1.4s infinite; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
    }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  }
`;