import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { BiSearchAlt2 } from "react-icons/bi";

// Using the WhatsApp logo for branding
const Logo = "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg";

export default function Contacts({ contacts, changeChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  
  // State for Search functionality
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
                    <div className="bio">
                        <p>{contact.about || "Hey there! I am using Snappy."}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            
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
  grid-template-rows: 10% 8% 67% 15%; /* Modernized layout distribution */
  overflow: hidden;
  background-color: var(--bg-darker);
  
  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    img { height: 2rem; }
    h3 { 
      color: white; 
      text-transform: uppercase; 
      letter-spacing: 1px;
    }
  }

  .search-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 1rem;
    .input-container {
        width: 100%;
        border-radius: 20px; /* Rounded pill shape for modern look */
        display: flex;
        align-items: center;
        gap: 1rem;
        background-color: #ffffff10;
        border: 1px solid #ffffff20;
        padding: 0.4rem 1rem;
        transition: 0.3s ease;
        
        &:focus-within {
            border-color: var(--primary-purple);
            background: #ffffff15;
        }
        
        svg {
            color: var(--text-muted);
            font-size: 1.1rem;
        }
        
        input {
            background-color: transparent;
            border: none;
            color: white;
            width: 100%;
            font-size: 0.9rem;
            &:focus {
                outline: none;
            }
            &::placeholder {
                color: #666;
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
    
    &::-webkit-scrollbar { 
      width: 0.2rem; 
      &-thumb { 
        background-color: #ffffff39; 
        width: 0.1rem; 
        border-radius: 1rem; 
      } 
    }
    
    .contact {
      min-height: 4.5rem;
      cursor: pointer;
      width: 95%; /* Slightly wider for better use of space */
      border-radius: 0.5rem;
      padding: 0.7rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: 0.2s ease-in-out;
      background-color: transparent;
      
      &:hover {
        background-color: #ffffff08;
      }
      
      .avatar { img { height: 2.8rem; } }
      
      .user-details {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          overflow: hidden;
          
          .username { 
            h3 { 
              color: white; 
              font-size: 1rem; 
              font-weight: 500;
            } 
          }
          .bio { 
            p { 
              color: var(--text-muted); 
              font-size: 0.8rem; 
              overflow: hidden; 
              white-space: nowrap; 
              text-overflow: ellipsis; 
            } 
          }
      }
    }
    
    .selected { 
      background-color: #ffffff15 !important; 
      border-left: 4px solid var(--primary-purple);
      border-radius: 0 0.5rem 0.5rem 0;
    }
    
    .no-contacts {
        color: var(--text-muted);
        margin-top: 2rem;
        font-size: 0.9rem;
    }
  }

  .current-user {
    background-color: #0d0d30;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    border-top: 1px solid #ffffff10;
    .avatar { img { height: 3.5rem; max-inline-size: 100%; } }
    .username { h2 { color: white; font-size: 1.2rem; } }
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.5rem;
      .username { h2 { font-size: 1rem; } }
    }
  }
`;