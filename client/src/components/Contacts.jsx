import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { BiSearchAlt2 } from "react-icons/bi"; // Make sure to install: npm install react-icons

// Using the WhatsApp logo you provided
const Logo = "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg";

export default function Contacts({ contacts, changeChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  
  // New State for Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredContacts, setFilteredContacts] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
      if (data) {
        setCurrentUserName(data.username);
        setCurrentUserImage(data.avatarImage);
      }
    }
    fetchData();
  }, []);

  // Filter contacts whenever the search query or contacts list changes
  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = contacts.filter((contact) => 
      contact.username.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  return (
    <>
      {currentUserImage && currentUserName && (
        <Container>
          <div className="brand">
            <img src={Logo} alt="logo" />
            <h3>snappy</h3>
          </div>
          
          {/* --- NEW: Search Bar --- */}
          <div className="search-bar">
            <div className="input-container">
               <BiSearchAlt2 />
               <input 
                 type="text" 
                 placeholder="Search contacts..." 
                 onChange={(e) => setSearchQuery(e.target.value)}
                 value={searchQuery}
               />
            </div>
          </div>

          <div className="contacts">
            {/* We map over filteredContacts instead of contacts */}
            {filteredContacts.map((contact, index) => {
              return (
                <div
                  key={contact._id}
                  className={`contact ${index === currentSelected ? "selected" : ""}`}
                  onClick={() => changeCurrentChat(index, contact)}
                >
                  <div className="avatar">
                    <img src={`data:image/svg+xml;base64,${contact.avatarImage}`} alt="" />
                  </div>
                  <div className="user-details">
                    <div className="username">
                      <h3>{contact.username}</h3>
                    </div>
                    {/* Placeholder for Bio/Last Message - Improves UI Density */}
                    <div className="bio">
                        <p>{contact.about || "Hey there! I am using Snappy."}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Show message if no contacts found */}
            {filteredContacts.length === 0 && (
                <div className="no-contacts">
                    <p>No contacts found</p>
                </div>
            )}
          </div>
          
          <div className="current-user">
            <div className="avatar">
              <img src={`data:image/svg+xml;base64,${currentUserImage}`} alt="avatar" />
            </div>
            <div className="username">
              <h2>{currentUserName}</h2>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 10% 65% 15%; /* Adjusted rows to fit search bar */
  overflow: hidden;
  background-color: #080420;
  
  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    img { height: 2rem; }
    h3 { color: white; text-transform: uppercase; }
  }

  /* --- Search Bar Styles --- */
  .search-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 1rem;
    .input-container {
        width: 100%;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        background-color: #ffffff34;
        padding: 0.5rem 1rem;
        
        svg {
            color: white;
            font-size: 1.2rem;
        }
        
        input {
            background-color: transparent;
            border: none;
            color: white;
            width: 100%;
            font-size: 1rem;
            &:focus {
                outline: none;
            }
            &::placeholder {
                color: #cfcfcf;
            }
        }
    }
  }

  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    gap: 0.8rem;
    padding-top: 1rem;
    
    &::-webkit-scrollbar { width: 0.2rem; &-thumb { background-color: #ffffff39; width: 0.1rem; border-radius: 1rem; } }
    
    .contact {
      background-color: #ffffff34;
      min-height: 4.5rem; /* Slightly compact */
      cursor: pointer;
      width: 90%;
      border-radius: 0.2rem;
      padding: 0.4rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: 0.2s ease-in-out;
      
      .avatar { img { height: 3rem; } }
      
      .user-details {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          overflow: hidden;
          
          .username { h3 { color: white; font-size: 1.1rem; } }
          .bio { p { color: #cfcfcf; font-size: 0.8rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; } }
      }
    }
    
    .selected { background-color: #9a86f3; }
    
    .no-contacts {
        color: white;
        margin-top: 2rem;
    }
  }

  .current-user {
    background-color: #0d0d30;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    .avatar { img { height: 4rem; max-inline-size: 100%; } }
    .username { h2 { color: white; } }
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.5rem;
      .username { h2 { font-size: 1rem; } }
    }
  }
`;