import React, { useState, useEffect } from "react";
import styled from "styled-components";

export default function Welcome() {
  const [userName, setUserName] = useState("");
  
  useEffect(() => {
    async function fetchUser() {
        // Safe check for session storage
        const storedUser = sessionStorage.getItem("chat-app-user");
        if(storedUser) {
            const user = await JSON.parse(storedUser);
            setUserName(user.username);
        }
    }
    fetchUser();
  }, []);

  return (
    <Container>
      {/* Friendly Robot Mascot GIF */}
      <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODF4bXF6Z2lxMzY1bHdod2Z3a3g1am16Z3I0eWx6eXJ6eXJ6eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/LmNd2q5E7m8rW/giphy.gif" alt="Robot" />
      <h1>
        Welcome, <span>{userName}!</span>
      </h1>
      <h3>Please select a chat to start messaging.</h3>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  flex-direction: column;
  height: 100%; /* Fills the chat window area */
  background: radial-gradient(circle at center, #1e1e30 0%, #131324 70%);
  
  img {
    height: 15rem;
    margin-bottom: 2rem;
    filter: drop-shadow(0 0 20px #4e0eff40);
    transition: transform 0.3s ease;
    
    &:hover {
        transform: scale(1.05);
    }
  }
  
  h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
      
      span {
          color: #4e0eff;
          text-shadow: 0 0 10px #4e0eff60;
      }
  }
  
  h3 {
      color: #cfcfcf;
      font-weight: 300;
      font-size: 1.1rem;
      opacity: 0.8;
  }
`;