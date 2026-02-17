import React, { useState, useEffect, useRef, useContext } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { 
  sendMessageRoute, 
  recieveMessageRoute, 
  host 
} from "../utils/APIRoutes";
import { 
  IoCheckmarkDone, 
  IoCheckmark, 
  IoSearch, 
  IoMoon, 
  IoSunny,
  IoArrowBack 
} from "react-icons/io5";
import { ThemeContext } from "../App";

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Local state to track the chat partner's online status in real-time
  const [chatUserStatus, setChatUserStatus] = useState({
    isOnline: currentChat?.isOnline || false,
    lastSeen: currentChat?.lastSeen || null
  });

  const scrollRef = useRef();
  const { theme, toggleTheme } = useContext(ThemeContext);

  // Sync local status state when switching chats
  useEffect(() => {
    setChatUserStatus({
      isOnline: currentChat.isOnline,
      lastSeen: currentChat.lastSeen
    });
  }, [currentChat]);

  // --- Fetch Messages & Mark as Read ---
  useEffect(() => {
    async function fetchMessages() {
      if (currentChat) {
        const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
        const response = await axios.post(recieveMessageRoute, {
          from: data._id,
          to: currentChat._id,
        });
        setMessages(response.data);
        
        // Emit 'Read' event immediately when opening the chat
        socket.current.emit("msg-read", { to: data._id, from: currentChat._id });
      }
    }
    fetchMessages();
  }, [currentChat]);

  // --- Socket Event Listeners ---
  useEffect(() => {
    if (socket.current) {
      // 1. Receive Message
      socket.current.on("msg-recieve", (data) => {
        // Send 'Delivered' receipt back to sender
        const user = JSON.parse(sessionStorage.getItem("chat-app-user"));
        socket.current.emit("msg-delivered", { messageId: data.data?._id, from: user._id });
        
        setArrivalMessage({ 
          fromSelf: false, 
          message: data.msg, 
          messageType: data.messageType,
          attachment: data.attachment,
          messageStatus: "delivered", // It's delivered to us now
          createdAt: new Date()
        });
      });

      // 2. Status Updates (Sent -> Delivered)
      socket.current.on("msg-status-update", ({ messageId, status }) => {
        setMessages(prev => prev.map(msg => 
            msg._id === messageId ? { ...msg, messageStatus: status } : msg
        ));
      });
      
      // 3. Read Receipts (Delivered -> Read)
      socket.current.on("msg-read-recieve", (readerId) => {
        // Mark all my messages to this user as read
        setMessages(prev => prev.map(msg => 
            msg.fromSelf ? { ...msg, messageStatus: "read" } : msg
        ));
      });

      // 4. User Online Status Change (Real-time header update)
      socket.current.on("user-status-change", ({ userId, isOnline, lastSeen }) => {
        if (userId === currentChat._id) {
            setChatUserStatus({ isOnline, lastSeen });
        }
      });
    }
  }, [currentChat]);

  // --- Append Incoming Message ---
  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  // --- Auto Scroll ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Send Message Handler ---
  const handleSendMsg = async (content, type = "text", attachmentData = null) => {
    const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
    
    // Optimistic UI Update (Show message immediately)
    const tempId = uuidv4();
    const newMsg = {
        _id: tempId,
        fromSelf: true,
        message: { text: content, attachment: attachmentData },
        messageType: type,
        messageStatus: "sent",
        createdAt: new Date()
    };
    setMessages([...messages, newMsg]);

    const payload = {
      from: data._id,
      to: currentChat._id,
      message: content,
      attachment: attachmentData,
      messageType: type
    };
    
    socket.current.emit("send-msg", payload);
    const res = await axios.post(sendMessageRoute, payload);
    
    // Update the temp ID with the real DB ID once confirmed
    if (res.data.data) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: res.data.data._id } : m));
    }
  };

  // --- Format Last Seen Date ---
  const formatLastSeen = (dateString) => {
      if(!dateString) return "Offline";
      const date = new Date(dateString);
      // Check if date is today
      const today = new Date();
      const isToday = date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear();
      
      const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      return `Last seen ${isToday ? 'today' : date.toLocaleDateString()} at ${timeStr}`;
  };

  // --- Filter Messages for Search ---
  const filteredMessages = messages.filter(msg => {
      if(!searchQuery) return true;
      // Only search text messages
      if(msg.messageType === "text" && msg.message?.text) {
          return msg.message.text.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return false;
  });

  return (
    <Container theme={theme}>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img src={`data:image/svg+xml;base64,${currentChat.avatarImage}`} alt="avatar" />
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
            <span className="status">
                {chatUserStatus.isOnline ? (
                    <span className="online-indicator">Online</span>
                ) : (
                    formatLastSeen(chatUserStatus.lastSeen)
                )}
            </span>
          </div>
        </div>
        <div className="header-actions">
            <div className={`search-box ${showSearch ? 'active' : ''}`}>
                <IoSearch onClick={() => setShowSearch(!showSearch)} />
                {showSearch && (
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        autoFocus
                    />
                )}
            </div>
            <div onClick={toggleTheme} className="theme-toggle" title="Toggle Theme">
                {theme === 'dark' ? <IoSunny /> : <IoMoon />}
            </div>
            <Logout />
        </div>
      </div>
      
      <div className="chat-messages">
        {filteredMessages.map((message) => {
          return (
            <div ref={scrollRef} key={message._id || uuidv4()} className={`message-wrapper ${message.fromSelf ? "sended" : "recieved"}`}>
              <div className="message-content">
                <div className="bubble">
                    {/* Render Attachment or Text */}
                    {message.messageType === "attachment" ? (
                       <div className="attachment">
                          {message.message.attachment.mimeType.startsWith('image') ? (
                             <img src={message.message.attachment.url} alt="file" />
                          ) : message.message.attachment.mimeType.startsWith('video') ? (
                             <video src={message.message.attachment.url} controls />
                          ) : (
                             <a href={message.message.attachment.url} download target="_blank" rel="noreferrer" className="file-download">
                                📄 {message.message.attachment.fileName || "Download File"}
                             </a>
                          )}
                          {/* Caption if provided (optional extension) */}
                          {message.message.text && <p className="caption">{message.message.text}</p>}
                       </div>
                    ) : (
                        <p>{message.message.text}</p>
                    )}
                    
                    {/* Metadata: Time and Status Ticks */}
                    <div className="meta">
                        <span className="time">
                            {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {message.fromSelf && (
                            <div className="ticks">
                                {message.messageStatus === "sent" && <IoCheckmark />}
                                {message.messageStatus === "delivered" && <IoCheckmark className="delivered" />}
                                {message.messageStatus === "read" && <IoCheckmarkDone className="read" />}
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  background-color: var(--bg-color); /* Uses CSS Variable from index.css */
  
  .chat-header {
    display: flex; justify-content: space-between; align-items: center; padding: 0 2rem;
    background-color: var(--header-bg);
    border-bottom: 1px solid #ffffff10;
    
    .user-details {
      display: flex; align-items: center; gap: 1rem;
      .avatar img { height: 3rem; }
      .username {
          display: flex; flex-direction: column;
          h3 { color: var(--text-color); margin: 0; font-size: 1.1rem; }
          .status { color: #aaa; font-size: 0.8rem; margin-top: 3px; }
          .online-indicator { color: var(--accent-color); font-weight: bold; }
      }
    }

    .header-actions {
        display: flex; align-items: center; gap: 1.5rem; color: var(--text-color);
        
        .theme-toggle { cursor: pointer; display: flex; align-items: center; svg { font-size: 1.3rem; } }
        
        .search-box {
            display: flex; align-items: center; gap: 10px;
            background: transparent; padding: 5px; border-radius: 20px; transition: 0.3s;
            &.active { background: var(--input-bg); padding: 5px 15px; }
            svg { font-size: 1.3rem; cursor: pointer; }
            input { 
                background: transparent; border: none; color: var(--text-color); outline: none; width: 150px; 
            }
        }
    }
  }
  
  .chat-messages {
    padding: 1rem 2rem; display: flex; flex-direction: column; gap: 1rem; overflow: auto;
    background-color: var(--chat-bg);
    background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png"); /* Optional generic pattern */
    background-blend-mode: overlay;
    
    .message-wrapper {
      display: flex;
      .message-content {
        max-width: 60%;
        .bubble {
            padding: 0.5rem 1rem; border-radius: 8px; color: var(--text-color);
            position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            
            p { margin: 0; word-wrap: break-word; line-height: 1.4; font-size: 0.95rem; }
            
            .attachment {
                img, video { max-width: 100%; border-radius: 6px; margin-bottom: 5px; display: block; }
                .file-download { 
                    display: flex; align-items: center; gap: 5px; text-decoration: none; 
                    color: var(--text-color); background: rgba(0,0,0,0.1); padding: 10px; border-radius: 5px; 
                }
            }
            
            .meta { 
                display: flex; justify-content: flex-end; align-items: center; gap: 0.3rem; margin-top: 4px; 
                .time { font-size: 0.65rem; color: #999; margin-top: 2px; }
                .ticks { 
                    font-size: 1rem; display: flex;
                    svg { color: #999; }
                    .delivered { color: #999; } /* Double tick grey */
                    .read { color: #53bdeb; }   /* Double tick blue */
                }
            }
        }
      }
    }
    
    .sended { 
        justify-content: flex-end; 
        .bubble { background-color: var(--msg-sent); border-top-right-radius: 0; } 
    }
    .recieved { 
        justify-content: flex-start; 
        .bubble { background-color: var(--msg-recieved); border-top-left-radius: 0; } 
    }
  }
`;