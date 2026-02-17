export const host = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Auth & User
export const loginRoute = `${host}/api/auth/login`;
export const registerRoute = `${host}/api/auth/register`;
export const logoutRoute = `${host}/api/auth/logout`;
export const allUsersRoute = `${host}/api/auth/allusers`;
export const setAvatarRoute = `${host}/api/auth/setavatar`;
export const randomAvatarRoute = `${host}/api/auth/avatar`;

// Messaging
export const sendMessageRoute = `${host}/api/messages/addmsg`;
export const recieveMessageRoute = `${host}/api/messages/getmsg`;
export const addReactionRoute = `${host}/api/messages/reaction`;
export const searchMessageRoute = `${host}/api/messages/search`;
export const uploadMessageRoute = `${host}/api/messages/upload`;

// Organization
export const pinRoute = `${host}/api/auth/pin`;
export const archiveRoute = `${host}/api/auth/archive`;
export const muteRoute = `${host}/api/auth/mute`;

// Groups
export const createGroupRoute = `${host}/api/groups/create`;
export const getGroupsRoute = `${host}/api/groups/getgroups`;
export const addGroupMemberRoute = `${host}/api/groups/addmember`;
export const removeGroupMemberRoute = `${host}/api/groups/removemember`;