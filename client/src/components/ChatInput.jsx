import React, { useState, useRef } from "react";
import { BsEmojiSmileFill, BsMicFill, BsFillStopFill, BsPaperclip } from "react-icons/bs";
import { IoMdSend, IoMdClose } from "react-icons/io";
import styled from "styled-components";
import Picker from "emoji-picker-react";

export default function ChatInput({ handleSendMsg, handleTyping, replyTo, clearReply }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const handleEmojiPickerhideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (event, emojiObject) => {
    let message = msg;
    message += emojiObject.emoji;
    setMsg(message);
    if (handleTyping) handleTyping(true);
  };

  // --- File Handling (Image/Video/PDF) ---
  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Send file immediately as attachment
        const attachmentData = {
          url: reader.result,
          mimeType: file.type,
          fileName: file.name
        };
        handleSendMsg(null, "attachment", attachmentData);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Audio Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          handleSendMsg(reader.result, "audio"); 
        };
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      if (handleTyping) handleTyping(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (handleTyping) handleTyping(false);
    }
  };

  const sendChat = (event) => {
    event.preventDefault();
    if (msg.length > 0) {
      // Basic Link Detection
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = msg.match(urlRegex);
      let linkMetadata = null;
      
      if (urls && urls.length > 0) {
        // In a real app, you'd fetch metadata here or on backend
        linkMetadata = {
            url: urls[0],
            title: "Link Preview", // Placeholder
            description: "Click to visit link",
            image: "" 
        };
      }

      handleSendMsg(msg, "text", null, linkMetadata);
      setMsg("");
      if (handleTyping) handleTyping(false);
    }
  };

  const handleChange = (e) => {
    setMsg(e.target.value);
    if (handleTyping) handleTyping(e.target.value.length > 0);
  };

  return (
    <Container>
      {/* Reply Preview Area */}
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-content">
            <span>Replying to {replyTo.username}</span>
            <p>{replyTo.message.text || "Media Attachment"}</p>
          </div>
          <IoMdClose onClick={clearReply} className="close-reply" />
        </div>
      )}

      <div className="button-container">
        <div className="emoji">
          <BsEmojiSmileFill onClick={handleEmojiPickerhideShow} />
          {showEmojiPicker && <Picker onEmojiClick={handleEmojiClick} />}
        </div>
        
        {/* File Attachment Button */}
        <div className="attach">
            <BsPaperclip onClick={handleFileClick} />
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{display: "none"}} 
                onChange={handleFileChange}
                accept="image/*,video/*,application/pdf"
            />
        </div>

        <div className="mic-container">
          {isRecording ? (
            <BsFillStopFill className="recording" onClick={stopRecording} />
          ) : (
            <BsMicFill onClick={startRecording} />
          )}
        </div>
      </div>
      <form className="input-container" onSubmit={(event) => sendChat(event)}>
        <input
          type="text"
          placeholder="Type your message here..."
          onChange={handleChange}
          value={msg}
          disabled={isRecording}
        />
        <button type="submit">
          <IoMdSend />
        </button>
      </form>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: 15% 85%;
  background-color: #080420;
  padding: 1rem 2rem;
  border-top: 1px solid #ffffff10;
  position: relative;
  
  .reply-preview {
    position: absolute;
    bottom: 100%;
    left: 0;
    width: 100%;
    background-color: #0d0d30;
    padding: 0.5rem 2rem;
    border-top: 1px solid #9a86f3;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .reply-content {
        span { color: #9a86f3; font-weight: bold; font-size: 0.8rem; }
        p { color: #cfcfcf; font-size: 0.9rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }
    .close-reply { color: white; cursor: pointer; font-size: 1.2rem; }
  }

  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0.8rem 1rem;
    gap: 1rem;
  }

  .button-container {
    display: flex;
    align-items: center;
    color: white;
    gap: 1rem;
    .emoji {
      position: relative;
      svg { font-size: 1.5rem; color: #ffff00c8; cursor: pointer; }
      .emoji-picker-react {
        position: absolute;
        top: -450px;
        background-color: #080420;
        box-shadow: 0 5px 10px #9a86f3;
        border-color: #9a86f3;
      }
    }
    .attach {
        svg { font-size: 1.5rem; color: #e0e0e0; cursor: pointer; transform: rotate(45deg); transition: 0.2s; &:hover { color: white; } }
    }
    .mic-container {
      svg { font-size: 1.4rem; color: #e0e0e0; cursor: pointer; transition: 0.2s; &:hover { color: white; } }
      .recording { color: #ff4b4b; animation: pulse 1s infinite; filter: drop-shadow(0 0 5px #ff4b4b); }
    }
  }

  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

  .input-container {
    width: 100%;
    border-radius: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background-color: #ffffff08;
    border: 1px solid #ffffff15;
    padding: 0.2rem 0.5rem 0.2rem 1.2rem;
    transition: 0.3s ease;
    
    &:focus-within {
      background-color: #ffffff10;
      border-color: #9a86f340;
    }

    input {
      width: 90%;
      height: 2.5rem;
      background-color: transparent;
      color: white;
      border: none;
      font-size: 1rem;
      &::placeholder { color: #666; }
      &:focus { outline: none; }
    }

    button {
      padding: 0.4rem 1.5rem;
      border-radius: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #9a86f3;
      border: none;
      cursor: pointer;
      transition: 0.3s ease;
      &:hover { filter: brightness(1.1); }
      svg { font-size: 1.5rem; color: white; }
    }
  }
`;