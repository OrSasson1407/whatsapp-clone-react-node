import React, { useState, useRef } from "react";
import { BsEmojiSmileFill, BsPaperclip } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import styled from "styled-components";
import Picker from "emoji-picker-react";
import axios from "axios";
import { uploadMessageRoute } from "../utils/APIRoutes";

export default function ChatInput({ handleSendMsg }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleEmojiPickerhideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (event, emojiObject) => {
    let message = msg;
    // Note: Depending on emoji-picker-react version, this might be emojiObject.emoji or just emojiObject
    message += emojiObject.emoji; 
    setMsg(message);
  };

  const sendChat = (event) => {
    event.preventDefault();
    if (msg.length > 0) {
      // Send as text message
      handleSendMsg(msg, "text");
      setMsg("");
      setShowEmojiPicker(false);
    }
  };

  const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
          // 1. Upload the file to the server first
          const res = await axios.post(uploadMessageRoute, formData, {
              headers: { "Content-Type": "multipart/form-data" }
          });
          
          // 2. Construct attachment data from response
          const attachmentData = {
              url: res.data.url,
              mimeType: res.data.mimeType,
              fileName: res.data.fileName
          };
          
          // 3. Send message with attachment (and optional caption if msg has text)
          handleSendMsg(msg, "attachment", attachmentData);
          setMsg(""); // Clear input/caption
          setShowEmojiPicker(false);
          
      } catch (err) {
          console.error("File upload failed", err);
          alert("Failed to upload file. Please check file size or server connection.");
      } finally {
          setIsUploading(false);
          // Reset file input so the same file can be selected again if needed
          if(fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  return (
    <Container>
      <div className="button-container">
        <div className="emoji">
          <BsEmojiSmileFill onClick={handleEmojiPickerhideShow} />
          {showEmojiPicker && (
            <div className="emoji-picker-wrapper">
               <Picker onEmojiClick={handleEmojiClick} theme="dark" />
            </div>
          )}
        </div>
        
        <div className="attach">
            <BsPaperclip 
                onClick={() => !isUploading && fileInputRef.current.click()} 
                title="Attach File" 
            />
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
                disabled={isUploading}
            />
        </div>
      </div>
      
      <form className="input-container" onSubmit={(event) => sendChat(event)}>
        <input
          type="text"
          placeholder={isUploading ? "Uploading file..." : "Type your message here"}
          onChange={(e) => setMsg(e.target.value)}
          value={msg}
          disabled={isUploading}
        />
        <button type="submit" disabled={isUploading || msg.length === 0}>
          <IoMdSend />
        </button>
      </form>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: 10% 90%;
  background-color: var(--header-bg);
  padding: 0 2rem;
  
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0 1rem;
    gap: 1rem;
  }
  
  .button-container {
    display: flex;
    align-items: center;
    color: var(--text-color);
    gap: 1rem;
    
    .emoji {
      position: relative;
      svg {
        font-size: 1.5rem;
        color: #ffff00c8;
        cursor: pointer;
      }
      .emoji-picker-wrapper {
        position: absolute;
        top: -470px;
        left: 0;
        z-index: 10;
        box-shadow: 0 5px 10px #9a86f3;
        border-color: #9a86f3;
        .emoji-picker-react {
           background-color: var(--bg-color);
           border-color: #9a86f3;
        }
      }
    }
    
    .attach {
        svg {
            font-size: 1.5rem;
            color: var(--text-color);
            cursor: pointer;
            transform: rotate(45deg);
            transition: 0.3s ease;
            &:hover {
                color: var(--accent-color);
            }
        }
    }
  }
  
  .input-container {
    width: 100%;
    border-radius: 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    background-color: var(--input-bg);
    padding: 0.3rem;
    
    input {
      width: 90%;
      height: 60%;
      background-color: transparent;
      color: var(--text-color);
      border: none;
      padding-left: 1rem;
      font-size: 1rem;

      &::placeholder {
        color: #ccc;
      }

      &:focus {
        outline: none;
      }
      
      &:disabled {
        cursor: not-allowed;
        opacity: 0.7;
      }
    }
    
    button {
      padding: 0.5rem 1.5rem;
      border-radius: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: var(--accent-color);
      border: none;
      cursor: pointer;
      transition: 0.3s ease;
      
      @media screen and (min-width: 720px) and (max-width: 1080px) {
        padding: 0.3rem 1rem;
        svg {
          font-size: 1rem;
        }
      }
      
      &:hover {
        opacity: 0.9;
      }
      
      &:disabled {
        background-color: gray;
        cursor: not-allowed;
      }
      
      svg {
        font-size: 1.5rem;
        color: white;
      }
    }
  }
`;