import React, { useState, useEffect } from "react";
import styled from "styled-components";

// שינינו את זה לקישור חיצוני כדי למנוע את השגיאה
const Robot = "https://media.giphy.com/media/RIYvDUlCgM9jdEcQw7/giphy.gif";

export default function Welcome() {
  const [userName, setUserName] = useState("");
  
  useEffect(() => {
    async function fetchUserName() {
      // הוספנו בדיקה כדי למנוע קריסה
      const storedUser = sessionStorage.getItem("chat-app-user");
      if (storedUser) {
        const user = await JSON.parse(storedUser);
        setUserName(user.username);
      }
    }
    fetchUserName();
  }, []);

  return (
    <Container>
      <img src={Robot} alt="" />
      <h1>
        Welcome, <span>{userName}!</span>
      </h1>
      <h3>Please select a chat to Start messaging.</h3>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  flex-direction: column;
  img {
    height: 20rem;
  }
  span {
    color: #4e0eff;
  }
`;