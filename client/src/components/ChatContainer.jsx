import React, { useState, useEffect, useRef, useContext } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import GroupInfo from "./GroupInfo"; 
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
  IoInformationCircleOutline,
  IoMoon,
  IoSunny
} from "react-icons/io5";
import { ThemeContext } from "../App";

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  
  const [chatUserStatus, setChatUserStatus] = useState({
    isOnline: currentChat?.isOnline || false,
    lastSeen: currentChat?.lastSeen || null
  });

  const scrollRef = useRef();
  const { theme, toggleTheme } = useContext(ThemeContext);

  useEffect(() => {
    setChatUserStatus({
      isOnline: currentChat.isOnline,
      lastSeen: currentChat.lastSeen
    });
    setShowGroupInfo(false);
    setMessages([]); // Clear chat immediately on switch
  }, [currentChat]);

  // --- FETCH MESSAGES ---
  useEffect(() => {
    async function fetchMessages() {
      if (currentChat && currentChat._id) {
        const userData = await JSON.parse(sessionStorage.getItem("chat-app-user"));
        if (!userData || !userData._id) return;

        try {
            const response = await axios.post(recieveMessageRoute, {
                from: userData._id,
                to: currentChat._id,
                isGroup: currentChat.isGroup || false,
            });

            if (Array.isArray(response.data)) {
                setMessages(response.data);
            } else {
                setMessages([]);
            }

            if(socket.current) {
                socket.current.emit("msg-read", { to: userData._id, from: currentChat._id });
            }
        } catch (err) {
            console.error("Error fetching messages:", err);
        }
      }
    }
    fetchMessages();
  }, [currentChat]);

  // --- SOCKET LISTENERS (FIXED) ---
  useEffect(() => {
    if (socket.current) {
      const handleMessageReceive = (data) => {
        const user = JSON.parse(sessionStorage.getItem("chat-app-user"));
        
        // Prevent duplicate delivery events for groups
        if(!data.groupId) {
             socket.current.emit("msg-delivered", { messageId: data.data?._id, from: user._id });
        }
        
        // 1. Construct Safe Sender
        const senderObj = (data.sender && data.sender.username) 
            ? data.sender 
            : { _id: data.sender || "unknown", username: "..." };

        // 2. CRITICAL FIX: Format message structure to match DB
        // Incoming 'data.msg' is likely a string. We need { text: string }.
        const messageContent = {
            text: typeof data.msg === 'string' ? data.msg : (data.msg?.text || ""),
            attachment: data.attachment || null
        };

        setArrivalMessage({ 
          fromSelf: false, 
          sender: senderObj,
          message: messageContent, // <--- Correct format
          messageType: data.messageType,
          attachment: data.attachment,
          messageStatus: "delivered",
          createdAt: new Date()
        });
      };

      const handleStatusUpdate = ({ messageId, status }) => {
        setMessages(prev => prev.map(msg => 
            msg._id === messageId ? { ...msg, messageStatus: status } : msg
        ));
      };

      const handleReadReceive = (readerId) => {
        setMessages(prev => prev.map(msg => 
            msg.fromSelf ? { ...msg, messageStatus: "read" } : msg
        ));
      };

      const handleUserStatusChange = ({ userId, isOnline, lastSeen }) => {
        if (userId === currentChat._id) {
            setChatUserStatus({ isOnline, lastSeen });
        }
      };

      socket.current.on("msg-recieve", handleMessageReceive);
      socket.current.on("msg-status-update", handleStatusUpdate);
      socket.current.on("msg-read-recieve", handleReadReceive);
      socket.current.on("user-status-change", handleUserStatusChange);

      return () => {
        socket.current.off("msg-recieve", handleMessageReceive);
        socket.current.off("msg-status-update", handleStatusUpdate);
        socket.current.off("msg-read-recieve", handleReadReceive);
        socket.current.off("user-status-change", handleUserStatusChange);
      };
    }
  }, [currentChat]);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMsg = async (content, type = "text", attachmentData = null) => {
    const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
    
    const tempId = uuidv4();
    const newMsg = {
        _id: tempId,
        fromSelf: true,
        sender: data, 
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
      messageType: type,
    };
    
    // Include groupId and members list for the server to handle broadcasting
    if (currentChat.isGroup) {
        payload.groupId = currentChat._id;
        // Sending members helps the server know who to notify if it doesn't query DB
        payload.members = currentChat.members.map(m => m._id || m); 
    }

    try {
        socket.current.emit("send-msg", payload);
        const res = await axios.post(sendMessageRoute, payload);
        
        if (res.data.data) {
            setMessages(prev => prev.map(m => m._id === tempId ? { ...m, _id: res.data.data._id } : m));
        }
    } catch (err) {
        console.error("Error sending message:", err);
    }
  };

  const formatLastSeen = (dateString) => {
      if(!dateString) return "Offline";
      const date = new Date(dateString);
      const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      return `Last seen ${date.toLocaleDateString()} at ${timeStr}`;
  };

  const filteredMessages = messages.filter(msg => {
      if(!searchQuery) return true;
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
             {currentChat.isGroup ? (
                 <div className="group-avatar-placeholder">{currentChat.username[0]}</div>
             ) : (
                <img 
                  src={currentChat.avatarImage 
                    ? `data:image/svg+xml;base64,${currentChat.avatarImage}` 
                    : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                  alt="avatar" 
                />
             )}
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
            {currentChat.isGroup ? (
                <span className="status">{currentChat.members ? currentChat.members.length : 0} members</span>
            ) : (
                <span className="status">
                    {chatUserStatus.isOnline ? <span className="online-indicator">Online</span> : formatLastSeen(chatUserStatus.lastSeen)}
                </span>
            )}
          </div>
        </div>
        <div className="header-actions">
            {currentChat.isGroup && (
                <div title="Group Info">
                    <IoInformationCircleOutline onClick={() => setShowGroupInfo(true)} />
                </div>
            )}
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
            <div onClick={toggleTheme} className="theme-toggle">
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
                {!message.fromSelf && currentChat.isGroup && message.sender && (
                    <span className="sender-name">{message.sender.username || "Unknown"}</span>
                )}
                
                <div className="bubble">
                    {message.messageType === "attachment" ? (
                       <div className="attachment">
                          {message.message?.attachment?.mimeType?.startsWith('image') ? (
                             <img src={message.message.attachment.url} alt="file" />
                          ) : (
                             <a href={message.message?.attachment?.url || "#"} download>Download File</a>
                          )}
                       </div>
                    ) : (
                        <p>{message.message?.text || ""}</p>
                    )}
                    
                    <div className="meta">
                        <span className="time">
                            {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
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

      {showGroupInfo && (
        <GroupInfo 
            currentChat={currentChat} 
            closePanel={() => setShowGroupInfo(false)} 
        />
      )}
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  background-color: var(--bg-color);
  position: relative; 
  
  .chat-header {
    display: flex; justify-content: space-between; align-items: center; padding: 0 2rem;
    background-color: var(--header-bg);
    border-bottom: 1px solid #ffffff10;
    
    .user-details {
      display: flex; align-items: center; gap: 1rem;
      .avatar img { height: 3rem; }
      .group-avatar-placeholder { height: 3rem; width: 3rem; background: #9a86f3; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
      .username {
          display: flex; flex-direction: column;
          h3 { color: var(--text-color); margin: 0; font-size: 1.1rem; }
          .status { color: #aaa; font-size: 0.8rem; margin-top: 3px; }
          .online-indicator { color: var(--accent-color); font-weight: bold; }
      }
    }

    .header-actions {
        display: flex; align-items: center; gap: 1.5rem; color: var(--text-color);
        div { cursor: pointer; display: flex; align-items: center; }
        svg { font-size: 1.3rem; }
        .search-box {
            display: flex; align-items: center; gap: 10px;
            background: transparent; padding: 5px; border-radius: 20px; transition: 0.3s;
            &.active { background: var(--input-bg); padding: 5px 15px; }
            input { background: transparent; border: none; color: var(--text-color); outline: none; width: 150px; }
        }
    }
  }
  
  .chat-messages {
    padding: 1rem 2rem; display: flex; flex-direction: column; gap: 1rem; overflow: auto;
    background-color: var(--chat-bg);
    background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png"); 
    background-blend-mode: overlay;
    
    .message-wrapper {
      display: flex;
      .message-content {
        max-width: 60%;
        display: flex; flex-direction: column; 
        
        .sender-name {
            font-size: 0.75rem; color: #ffa0a0; margin-left: 10px; margin-bottom: 2px; font-weight: bold;
        }

        .bubble {
            padding: 0.5rem 1rem; border-radius: 8px; color: var(--text-color);
            position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            p { margin: 0; word-wrap: break-word; line-height: 1.4; font-size: 0.95rem; }
            .attachment {
                img, video { max-width: 100%; border-radius: 6px; margin-bottom: 5px; display: block; }
                a { color: var(--text-color); text-decoration: none; display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.1); padding: 5px; border-radius: 5px;}
            }
            .meta { 
                display: flex; justify-content: flex-end; align-items: center; gap: 0.3rem; margin-top: 4px; 
                .time { font-size: 0.65rem; color: #999; }
                .ticks { font-size: 1rem; display: flex; svg { color: #999; } .read { color: #53bdeb; } }
            }
        }
      }
    }
    .sended { justify-content: flex-end; .bubble { background-color: var(--msg-sent); border-top-right-radius: 0; } }
    .recieved { justify-content: flex-start; .bubble { background-color: var(--msg-recieved); border-top-left-radius: 0; } }
  }
`;