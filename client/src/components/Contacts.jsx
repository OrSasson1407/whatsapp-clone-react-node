import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { BiSearchAlt2, BiArchiveIn, BiPin, BiVolumeMute, BiPlus, BiX, BiCheck } from "react-icons/bi";
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

export default function Contacts({ contacts, changeChat }) { 
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  
  const [allContacts, setAllContacts] = useState([]); 
  const [displayContacts, setDisplayContacts] = useState([]);
  
  const [pinned, setPinned] = useState([]);
  const [archived, setArchived] = useState([]);
  const [muted, setMuted] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  
  // --- Create Group States ---
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

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

        const [usersRes, groupsRes] = await Promise.all([
            axios.get(`${allUsersRoute}/${data._id}`),
            axios.get(`${getGroupsRoute}/${data._id}`)
        ]);

        const users = usersRes.data.map(u => ({ ...u, type: 'user' }));
        const groups = groupsRes.data.map(g => ({ 
            ...g, 
            username: g.name, 
            avatarImage: "", 
            type: 'group',
            isGroup: true
        }));

        setAllContacts([...groups, ...users]);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = allContacts.filter(c => 
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (showArchived) {
        filtered = filtered.filter(c => archived.includes(c._id));
    } else {
        filtered = filtered.filter(c => !archived.includes(c._id));
    }

    filtered.sort((a, b) => {
        const isAPinned = pinned.includes(a._id);
        const isBPinned = pinned.includes(b._id);
        if (isAPinned && !isBPinned) return -1;
        if (!isAPinned && isBPinned) return 1;
        return 0; 
    });

    setDisplayContacts(filtered);
  }, [allContacts, searchQuery, pinned, archived, showArchived]);

  const handleAction = async (e, action, targetId) => {
    e.stopPropagation();
    const payload = { userId: currentUser._id, targetId };
    
    let res;
    if (action === 'pin') res = await axios.post(pinRoute, payload);
    if (action === 'archive') res = await axios.post(archiveRoute, payload);
    if (action === 'mute') res = await axios.post(muteRoute, payload);

    if (res.data.status) {
        const data = await JSON.parse(sessionStorage.getItem("chat-app-user"));
        if(action === 'pin') { setPinned(res.data.pinnedChats); data.pinnedChats = res.data.pinnedChats; }
        if(action === 'archive') { setArchived(res.data.archivedChats); data.archivedChats = res.data.archivedChats; }
        if(action === 'mute') { setMuted(res.data.mutedChats); data.mutedChats = res.data.mutedChats; }
        sessionStorage.setItem("chat-app-user", JSON.stringify(data));
    }
  };

  // --- Group Creation Logic ---
  const toggleMemberSelection = (userId) => {
      if(selectedGroupMembers.includes(userId)) {
          setSelectedGroupMembers(prev => prev.filter(id => id !== userId));
      } else {
          setSelectedGroupMembers(prev => [...prev, userId]);
      }
  };

  const createGroup = async () => {
    if(!newGroupName) return alert("Please enter a group name");
    if(selectedGroupMembers.length === 0) return alert("Please select at least one member");

    try {
        const { data } = await axios.post(createGroupRoute, {
            name: newGroupName,
            members: selectedGroupMembers,
            admin: currentUser._id
        });
        if(data.status) {
            const newGroup = { ...data.group, username: data.group.name, type: 'group', isGroup: true };
            setAllContacts([newGroup, ...allContacts]);
            setShowCreateGroupModal(false);
            setNewGroupName("");
            setSelectedGroupMembers([]);
        }
    } catch (err) {
        console.error(err);
    }
  };

  // Filter users for selection (exclude existing groups and self)
  const availableUsers = allContacts.filter(c => 
      !c.isGroup && 
      c._id !== currentUser?._id &&
      c.username.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

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
                 placeholder="Search chats..." 
                 onChange={(e) => setSearchQuery(e.target.value)}
                 value={searchQuery}
               />
            </div>
            <div className="icon-btn" onClick={() => setShowCreateGroupModal(true)} title="Create Group">
                <BiPlus />
            </div>
            <div className={`icon-btn ${showArchived ? "active" : ""}`} onClick={() => setShowArchived(!showArchived)} title="Archived">
                <BiArchiveIn />
            </div>
          </div>

          {/* --- CREATE GROUP MODAL --- */}
          {showCreateGroupModal && (
              <div className="modal-overlay">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h3>Create New Group</h3>
                          <BiX onClick={() => setShowCreateGroupModal(false)} />
                      </div>
                      
                      <div className="modal-body">
                          <input 
                            className="group-name-input"
                            type="text" 
                            placeholder="Group Subject" 
                            value={newGroupName} 
                            onChange={(e) => setNewGroupName(e.target.value)}
                            autoFocus
                          />
                          
                          <div className="member-selection">
                              <h4>Select Members ({selectedGroupMembers.length})</h4>
                              <input 
                                type="text" 
                                placeholder="Search contacts..." 
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="member-search"
                              />
                              <div className="member-list">
                                  {availableUsers.map(user => (
                                      <div 
                                        key={user._id} 
                                        className={`member-item ${selectedGroupMembers.includes(user._id) ? "selected" : ""}`}
                                        onClick={() => toggleMemberSelection(user._id)}
                                      >
                                          <div className="info">
                                              <img src={`data:image/svg+xml;base64,${user.avatarImage}`} alt="" />
                                              <span>{user.username}</span>
                                          </div>
                                          <div className="checkbox">
                                              {selectedGroupMembers.includes(user._id) && <BiCheck />}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="modal-footer">
                          <button onClick={createGroup}>Create Group</button>
                      </div>
                  </div>
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
                        <img 
                            src={contact.avatarImage 
                              ? `data:image/svg+xml;base64,${contact.avatarImage}`
                              : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                            alt="" 
                        />
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
  position: relative; /* For Modal Overlay */

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

  /* --- MODAL STYLES --- */
  .modal-overlay {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10;
      display: flex; justify-content: center; align-items: center;
      animation: fadeIn 0.2s ease;
  }
  .modal-content {
      background: #0d0d30; width: 90%; max-height: 80%; border-radius: 10px;
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid #ffffff20;
  }
  .modal-header {
      padding: 1rem; border-bottom: 1px solid #ffffff10; display: flex; justify-content: space-between; align-items: center;
      h3 { color: white; margin: 0; }
      svg { color: white; font-size: 1.5rem; cursor: pointer; }
  }
  .modal-body {
      padding: 1rem; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem;
      
      .group-name-input {
          padding: 10px; border-radius: 5px; border: none; outline: none; background: #ffffff10; color: white; font-size: 1rem;
      }
      .member-selection {
          display: flex; flex-direction: column; gap: 0.5rem;
          h4 { color: #9a86f3; margin: 0; font-size: 0.9rem; }
          .member-search {
              padding: 8px; border-radius: 5px; border: none; background: #ffffff05; color: white; outline: none; font-size: 0.9rem;
          }
          .member-list {
              display: flex; flex-direction: column; gap: 5px; max-height: 200px; overflow-y: auto;
              
              .member-item {
                  display: flex; justify-content: space-between; align-items: center; padding: 8px; border-radius: 5px; cursor: pointer;
                  background: #ffffff05;
                  &:hover { background: #ffffff10; }
                  &.selected { background: #9a86f330; border: 1px solid #9a86f3; }
                  
                  .info {
                      display: flex; align-items: center; gap: 10px;
                      img { width: 30px; height: 30px; border-radius: 50%; }
                      span { color: white; font-size: 0.9rem; }
                  }
                  .checkbox {
                      width: 20px; height: 20px; border-radius: 50%; border: 2px solid #aaa;
                      display: flex; align-items: center; justify-content: center;
                  }
                  &.selected .checkbox { background: #9a86f3; border-color: #9a86f3; color: white; }
              }
          }
      }
  }
  .modal-footer {
      padding: 1rem; border-top: 1px solid #ffffff10; display: flex; justify-content: flex-end;
      button {
          background: #9a86f3; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;
          &:hover { opacity: 0.9; }
      }
  }

  /* --- Contacts List --- */
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