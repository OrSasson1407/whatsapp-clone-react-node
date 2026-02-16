import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  
  // State management
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);

  // Effect 1: Check if user is logged in
  useEffect(() => {
    async function checkUser() {
      if (!sessionStorage.getItem("chat-app-user")) {
        navigate("/login");
      } else {
        setCurrentUser(
          await JSON.parse(sessionStorage.getItem("chat-app-user"))
        );
      }
    }
    checkUser();
  }, []);

  // Effect 2: Connect to Socket.io when user is loaded
  useEffect(() => {
    if (currentUser) {
      // Connect to the socket server
      socket.current = io(host);
      // Emit the "add-user" event to the server so it knows we are online
      socket.current.emit("add-user", currentUser._id);
    }
  }, [currentUser]);

  // Effect 3: Fetch contacts (all other users)
  useEffect(() => {
    async function fetchContacts() {
      if (currentUser) {
        if (currentUser.isAvatarImageSet) {
          const data = await axios.get(`${allUsersRoute}/${currentUser._id}`);
          setContacts(data.data);
        } else {
          // If user hasn't set an avatar, we might redirect them to set one
          // For now, we will just redirect to setAvatar page (optional logic)
          navigate("/setAvatar"); 
        }
      }
    }
    fetchContacts();
  }, [currentUser]);

  // Function to handle chat change (when clicking a contact)
  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  return (
    <>
      <Container>
        <div className="container">
          {/* Sidebar: List of Contacts */}
          <Contacts 
            contacts={contacts} 
            changeChat={handleChatChange} 
          />
          
          {/* Main Area: Show Welcome screen OR Chat Window */}
          {currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer 
              currentChat={currentChat} 
              socket={socket} 
            />
          )}
        </div>
      </Container>
    </>
  );
}

// Styled Components
const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: #131324;
  .container {
    height: 85vh;
    width: 85vw;
    background-color: #00000076;
    display: grid;
    grid-template-columns: 25% 75%;
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
    }
  }
`;