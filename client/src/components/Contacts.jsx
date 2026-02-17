import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { BiSearchAlt2, BiArchiveIn, BiPin, BiVolumeMute, BiPlus } from "react-icons/bi";
import { BsThreeDotsVertical } from "react-icons/bs";
import axios from "axios";
import { 
    allUsersRoute, 
    getGroupsRoute, 
    createGroupRoute, 
    pinRoute, 
    archiveRoute, 
    muteRoute 
} from "../utils/APIRoutes";

const Logo = "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg";

export default function Contacts({ contacts, changeChat }) { // Note: 'contacts' prop from parent might be just users, we fetch fresh here
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  
  // Lists
  const [allContacts, setAllContacts] = useState([]); // Users + Groups
  const [displayContacts, setDisplayContacts] = useState([]);
  
  // Preferences (Local state for UI speed, ideally synced with DB)
  const [pinned, setPinned] = useState([]);
  const [archived, setArchived] = useState([]);
  const [muted, setMuted] = useState([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  
  // Fetch Data
  useEffect(() => {
    async function fetchData() {
      const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
      if (data) {
        setCurrentUser(data);
        setCurrentUserName(data.username);
        setCurrentUserImage(data.avatarImage);
        setPinned(data.pinnedChats || []);
        setArchived(data.archivedChats || []);
        setMuted(data.mutedChats || []);

        // Fetch Users and Groups in parallel
        const [usersRes, groupsRes] = await Promise.all([
            axios.get(`${allUsersRoute}/${data._id}`),
            axios.get(`${getGroupsRoute}/${data._id}`)
        ]);

        // Normalize Data
        const users = usersRes.data.map(u => ({ ...u, type: 'user' }));
        const groups = groupsRes.data.map(g => ({ 
            ...g, 
            username: g.name, 
            avatarImage: "", // Use default or specific group logic
            type: 'group',
            isGroup: true
        }));

        setAllContacts([...groups, ...users]);
      }
    }
    fetchData();
  }, []);

  // Filter & Sort Logic
  useEffect(() => {
    let filtered = allContacts.filter(c => 
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter Archived
    if (showArchived) {
        filtered = filtered.filter(c => archived.includes(c._id));
    } else {
        filtered = filtered.filter(c => !archived.includes(c._id));
    }

    // Sort: Pinned first
    filtered.sort((a, b) => {
        const isAPinned = pinned.includes(a._id);
        const isBPinned = pinned.includes(b._id);
        if (isAPinned && !isBPinned) return -1;
        if (!isAPinned && isBPinned) return 1;
        return 0; 
    });

    setDisplayContacts(filtered);
  }, [allContacts, searchQuery, pinned, archived, showArchived]);

  // Actions
  const handleAction = async (e, action, targetId) => {
    e.stopPropagation();
    const payload = { userId: currentUser._id, targetId };
    
    let res;
    if (action === 'pin') res = await axios.post(pinRoute, payload);
    if (action === 'archive') res = await axios.post(archiveRoute, payload);
    if (action === 'mute') res = await axios.post(muteRoute, payload);

    if (res.data.status) {
        // Update local state
        const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
        if(action === 'pin') { setPinned(res.data.pinnedChats); data.pinnedChats = res.data.pinnedChats; }
        if(action === 'archive') { setArchived(res.data.archivedChats); data.archivedChats = res.data.archivedChats; }
        if(action === 'mute') { setMuted(res.data.mutedChats); data.mutedChats = res.data.mutedChats; }
        sessionStorage.setItem("chat-app-user", JSON.stringify(data));
    }
  };

  const createGroup = async () => {
    if(!newGroupName) return;
    const { data } = await axios.post(createGroupRoute, {
        name: newGroupName,
        members: [], // For simplicity, empty initially. Add logic to select members if needed.
        admin: currentUser._id
    });
    if(data.status) {
        const newGroup = { ...data.group, username: data.group.name, type: 'group', isGroup: true };
        setAllContacts([newGroup, ...allContacts]);
        setShowCreateGroup(false);
        setNewGroupName("");
    }
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
                 placeholder="Search..." 
                 onChange={(e) => setSearchQuery(e.target.value)}
                 value={searchQuery}
               />
            </div>
            <div className="icon-btn" onClick={() => setShowCreateGroup(!showCreateGroup)} title="Create Group">
                <BiPlus />
            </div>
            <div className={`icon-btn ${showArchived ? "active" : ""}`} onClick={() => setShowArchived(!showArchived)} title="Archived">
                <BiArchiveIn />
            </div>
          </div>

          {showCreateGroup && (
              <div className="create-group-panel">
                  <input 
                    type="text" 
                    placeholder="Group Name" 
                    value={newGroupName} 
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                  <button onClick={createGroup}>Create</button>
              </div>
          )}

          <div className="contacts">
            {showArchived && <div className="section-title">Archived Chats</div>}
            
            {displayContacts.map((contact, index) => {
              const isPinned = pinned.includes(contact._id);
              const isMuted = muted.includes(contact._id);
              
              return (
                <div
                  key={contact._id}
                  className={`contact ${index === currentSelected ? "selected" : ""}`}
                  onClick={() => { setCurrentSelected(index); changeChat(contact); }}
                >
                  <div className="avatar">
                    {contact.isGroup ? (
                        <div className="group-avatar-placeholder">{contact.username[0]}</div>
                    ) : (
                        <img src={`data:image/svg+xml;base64,${contact.avatarImage}`} alt="" />
                    )}
                  </div>
                  <div className="user-details">
                    <div className="username">
                      <h3>{contact.username}</h3>
                      <div className="icons">
                          {isPinned && <BiPin className="status-icon" />}
                          {isMuted && <BiVolumeMute className="status-icon" />}
                      </div>
                    </div>
                    <div className="bio">
                        <p>{contact.about || (contact.isGroup ? "Group Chat" : "Hey there!")}</p>
                    </div>
                  </div>
                  
                  {/* Hover Actions Menu */}
                  <div className="actions-menu">
                      <BiPin onClick={(e) => handleAction(e, 'pin', contact._id)} className={isPinned ? 'active' : ''} />
                      <BiArchiveIn onClick={(e) => handleAction(e, 'archive', contact._id)} />
                      <BiVolumeMute onClick={(e) => handleAction(e, 'mute', contact._id)} className={isMuted ? 'active' : ''}/>
                  </div>
                </div>
              );
            })}
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
  grid-template-rows: 10% 10% 65% 15%;
  overflow: hidden;
  background-color: #080420;
  
  .brand {
    display: flex; align-items: center; gap: 1rem; justify-content: center;
    img { height: 2rem; }
    h3 { color: white; text-transform: uppercase; }
  }

  .search-bar {
    display: flex; gap: 0.5rem; padding: 0 1rem; align-items: center;
    .input-container {
        width: 100%; border-radius: 20px; display: flex; align-items: center; gap: 1rem;
        background-color: #ffffff10; padding: 0.4rem 1rem;
        input { background: transparent; border: none; color: white; width: 100%; &:focus { outline: none; } }
        svg { color: #ccc; }
    }
    .icon-btn {
        color: white; font-size: 1.5rem; cursor: pointer; padding: 5px; border-radius: 50%;
        &:hover { background-color: #ffffff10; }
        &.active { color: #9a86f3; }
    }
  }

  .create-group-panel {
      padding: 0 1rem; display: flex; gap: 0.5rem;
      input { width: 70%; padding: 5px; border-radius: 5px; border: none; }
      button { width: 30%; background: #9a86f3; color: white; border: none; border-radius: 5px; cursor: pointer; }
  }

  .contacts {
    display: flex; flex-direction: column; align-items: center; overflow: auto; gap: 0.8rem; padding-top: 1rem;
    .section-title { color: #9a86f3; font-size: 0.8rem; width: 90%; margin-bottom: 5px; }
    
    .contact {
      background-color: #ffffff34; min-height: 4.5rem; cursor: pointer; width: 95%; border-radius: 0.5rem;
      padding: 0.4rem; display: flex; gap: 1rem; align-items: center; transition: 0.2s; position: relative;
      
      &:hover { background-color: #ffffff08; .actions-menu { display: flex; } }
      
      .avatar { 
          img { height: 3rem; } 
          .group-avatar-placeholder { height: 3rem; width: 3rem; background: #9a86f3; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
      }
      
      .user-details {
          display: flex; flex-direction: column; gap: 0.2rem; flex: 1;
          .username { 
              display: flex; justify-content: space-between; 
              h3 { color: white; font-size: 1rem; } 
              .icons { display: flex; gap: 5px; .status-icon { color: #ccc; font-size: 0.8rem; } }
          }
          .bio { p { color: #cfcfcf; font-size: 0.8rem; } }
      }

      .actions-menu {
          display: none; position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: #080420; padding: 5px; border-radius: 5px; gap: 8px;
          svg { color: #aaa; font-size: 1.1rem; &:hover { color: white; } &.active { color: #9a86f3; } }
      }
    }
    .selected { background-color: #9a86f3; }
  }

  .current-user {
    background-color: #0d0d30; display: flex; justify-content: center; align-items: center; gap: 2rem;
    .avatar img { height: 4rem; max-inline-size: 100%; }
    .username h2 { color: white; }
  }
`;