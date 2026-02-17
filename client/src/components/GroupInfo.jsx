import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { IoClose, IoPersonAdd, IoTrash } from "react-icons/io5"; 
import axios from "axios";
import { allUsersRoute, addGroupMemberRoute, removeGroupMemberRoute } from "../utils/APIRoutes";

export default function GroupInfo({ currentChat, closePanel }) {
  const [members, setMembers] = useState(currentChat.members || []);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(undefined);

  // Fallback image
  const defaultAvatar = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

  useEffect(() => {
    async function fetchUsers() {
      const user = await JSON.parse(sessionStorage.getItem("chat-app-user"));
      setCurrentUser(user);
      const { data } = await axios.get(`${allUsersRoute}/${user._id}`);
      setAllUsers(data);
    }
    fetchUsers();
  }, []);

  const handleAddMember = async (userId) => {
    try {
      const { data } = await axios.post(addGroupMemberRoute, {
        groupId: currentChat._id,
        userId: userId
      });

      if (data.status) {
        setMembers(data.group.members);
      } else {
        alert(data.msg || "Failed to add member");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (userId) => {
      if(!window.confirm("Are you sure you want to remove this user?")) return;
      try {
          const { data } = await axios.post(removeGroupMemberRoute, {
              groupId: currentChat._id,
              userId: userId
          });
          if (data.status) {
              setMembers(data.group.members);
          }
      } catch (err) {
          console.error(err);
      }
  };

  const searchResults = allUsers.filter((user) => {
    const isMember = members.find((m) => {
        const memberId = m._id || m; 
        return memberId === user._id;
    });
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && !isMember;
  });

  const isAdmin = currentUser && currentChat.admin === currentUser._id;

  return (
    <Container>
      <div className="header">
        <h3>Group Info</h3>
        <IoClose onClick={closePanel} />
      </div>

      <div className="scrollable-body">
        <div className="group-details">
            <div className="group-avatar">
                <div className="avatar-placeholder">{currentChat.username[0]}</div>
            </div>
            <h2>{currentChat.username}</h2>
            <p>{members.length} Members</p>
        </div>

        <div className="section">
            <h4>Current Members</h4>
            <div className="list">
            {members.map((member, index) => {
                const memberId = member._id || member;
                
                // Handle mixed data types (ID string vs User Object)
                let displayUser = member;
                if (typeof member === 'string') {
                    const found = allUsers.find(u => u._id === member);
                    if(found) displayUser = found;
                    else displayUser = { _id: member, username: "Loading...", avatarImage: null };
                }

                return (
                    <div key={displayUser._id || index} className="user-item">
                    <div className="info">
                        <img 
                            src={displayUser.avatarImage ? `data:image/svg+xml;base64,${displayUser.avatarImage}` : defaultAvatar} 
                            alt="avatar" 
                        />
                        <span>{displayUser.username}</span>
                        {currentChat.admin === displayUser._id && <span className="admin-badge">Admin</span>}
                    </div>
                    
                    {isAdmin && displayUser._id !== currentUser._id && (
                        <IoTrash className="delete-icon" onClick={() => handleRemoveMember(displayUser._id)} />
                    )}
                    </div>
                );
            })}
            </div>
        </div>

        <div className="section">
            <h4>Add New Member</h4>
            <input 
            type="text" 
            placeholder="Search contacts..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="list search-list">
            {searchQuery.length > 0 && searchResults.map((user) => (
                <div key={user._id} className="user-item add-item" onClick={() => handleAddMember(user._id)}>
                <div className="info">
                    <img 
                        src={user.avatarImage ? `data:image/svg+xml;base64,${user.avatarImage}` : defaultAvatar} 
                        alt="avatar" 
                    />
                    <span>{user.username}</span>
                </div>
                <IoPersonAdd />
                </div>
            ))}
            {searchQuery.length > 0 && searchResults.length === 0 && (
                <p className="no-result">No users found</p>
            )}
            </div>
        </div>
      </div>
    </Container>
  );
}

const Container = styled.div`
  position: absolute; top: 0; right: 0; height: 100%; width: 350px;
  background-color: #0d0d30; border-left: 1px solid #ffffff20; z-index: 100;
  display: flex; flex-direction: column; 
  animation: slideIn 0.3s ease;
  
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

  /* Fixed Header */
  .header { 
      padding: 1rem; 
      display: flex; justify-content: space-between; align-items: center; 
      color: white; border-bottom: 1px solid #ffffff10;
      flex-shrink: 0; /* Prevents header from shrinking */
      
      h3 { margin: 0; }
      svg { font-size: 1.5rem; cursor: pointer; } 
  }

  /* Scrollable Body Content */
  .scrollable-body {
      flex: 1; /* Takes up remaining space */
      overflow-y: auto; /* Enables vertical scrolling */
      padding: 1rem;
      display: flex; flex-direction: column; gap: 2rem;
      
      /* Custom Scrollbar */
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background-color: #ffffff20; border-radius: 4px; }
  }

  .group-details { 
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: white;
      .avatar-placeholder { width: 80px; height: 80px; border-radius: 50%; background-color: #9a86f3; color: white; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; text-transform: uppercase; } 
      h2 { margin: 0; font-size: 1.5rem; }
      p { color: #aaa; margin: 0; font-size: 0.9rem; } 
  }

  .section { 
      display: flex; flex-direction: column; gap: 1rem; color: white;
      h4 { color: #9a86f3; border-bottom: 1px solid #ffffff10; padding-bottom: 0.5rem; margin: 0; }
      
      input { 
          background-color: #ffffff10; border: none; padding: 0.8rem; border-radius: 0.5rem; color: white; outline: none; 
          &::placeholder { color: #aaa; }
      }

      .list { 
          /* Optional: Cap the height of lists so they scroll internally too, or remove max-height to let the main body scroll */
          max-height: 250px; overflow-y: auto; 
          display: flex; flex-direction: column; gap: 0.8rem; 
          
          &::-webkit-scrollbar { width: 4px; } 
          &::-webkit-scrollbar-thumb { background-color: #ffffff20; border-radius: 4px; }
          
          .user-item { 
              display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-radius: 0.5rem; transition: 0.2s; 
              
              .info { display: flex; align-items: center; gap: 1rem; }
              img { height: 2.5rem; width: 2.5rem; border-radius: 50%; object-fit: cover; }
              span { font-size: 0.9rem; }
              
              .admin-badge { font-size: 0.7rem; background: #9a86f3; padding: 2px 6px; border-radius: 4px; margin-left: 10px; }
              .delete-icon { color: #ff4d4d; cursor: pointer; font-size: 1.1rem; &:hover { color: red; } }
              
              &.add-item { cursor: pointer; &:hover { background-color: #ffffff10; } svg { color: #9a86f3; } }
          }
          .no-result { text-align: center; color: #777; margin-top: 1rem; }
      }
  }
`;