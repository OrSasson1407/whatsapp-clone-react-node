import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { Buffer } from "buffer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
// Import the proxy route
import { setAvatarRoute, randomAvatarRoute } from "../utils/APIRoutes";

export default function SetAvatar() {
  // Use the proxy route instead of the external URL
  const api = randomAvatarRoute; 
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(undefined);
  
  const toastOptions = {
    position: "bottom-right",
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };

  useEffect(() => {
    async function checkAuth() {
        if (!sessionStorage.getItem("chat-app-user")) {
            navigate("/login");
        }
    }
    checkAuth();
  }, [navigate]);

  const setProfilePicture = async () => {
    if (selectedAvatar === undefined) {
      toast.error("Please select an avatar", toastOptions);
    } else {
      const user = await JSON.parse(sessionStorage.getItem("chat-app-user"));
      
      const { data } = await axios.post(`${setAvatarRoute}/${user._id}`, {
        image: avatars[selectedAvatar],
      });

      if (data.isSet) {
        user.isAvatarImageSet = true;
        user.avatarImage = data.image;
        sessionStorage.setItem("chat-app-user", JSON.stringify(user));
        navigate("/");
      } else {
        toast.error("Error setting avatar. Please try again.", toastOptions);
      }
    }
  };

  useEffect(() => {
    async function fetchData() {
      const data = [];
      // Fetch 4 random avatars
      for (let i = 0; i < 4; i++) {
        try {
            // Updated to use the proxy route
            // The server will fetch from api.multiavatar.com and return the data
            const image = await axios.get(`${api}/${Math.round(Math.random() * 1000)}`);
            const buffer = new Buffer(image.data);
            data.push(buffer.toString("base64"));
        } catch (e) {
            console.error("Error fetching avatar", e);
        }
      }
      setAvatars(data);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  return (
    <>
      {isLoading ? (
        <Container>
          <div className="loader"></div>
          <h1>Loading Avatars...</h1>
        </Container>
      ) : (
        <Container>
          <div className="title-container">
            <h1>Pick an Avatar as your profile picture</h1>
          </div>
          <div className="avatars">
            {avatars.map((avatar, index) => {
              return (
                <div
                  key={index}
                  className={`avatar ${selectedAvatar === index ? "selected" : ""}`}
                >
                  <img
                    src={`data:image/svg+xml;base64,${avatar}`}
                    alt="avatar"
                    onClick={() => setSelectedAvatar(index)}
                  />
                </div>
              );
            })}
          </div>
          <button onClick={setProfilePicture} className="submit-btn">
            Set as Profile Picture
          </button>
        </Container>
      )}
      <ToastContainer />
    </>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 3rem;
  background-color: #131324;
  height: 100vh;
  width: 100vw;

  .loader {
    width: 60px; 
    height: 60px; 
    border: 5px solid #4e0eff; 
    border-bottom-color: transparent;
    border-radius: 50%; 
    animation: rotation 1s linear infinite;
  }
  
  @keyframes rotation { 
    0% { transform: rotate(0deg); } 
    100% { transform: rotate(360deg); } 
  }

  .title-container {
    h1 { 
        color: white; 
        text-align: center; 
        font-weight: 600;
        letter-spacing: 1px;
    }
  }

  .avatars {
    display: flex; 
    gap: 2rem;
    
    .avatar {
      border: 0.4rem solid transparent;
      padding: 0.4rem;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.4s ease-in-out;
      cursor: pointer;
      
      img { 
        height: 6rem; 
        transition: 0.4s ease-in-out; 
      }
      
      &:hover { 
        border-color: #997af0; 
        transform: scale(1.1); 
        box-shadow: 0 0 15px #997af080;
      }
    }
    
    .selected {
      border-color: #4e0eff;
      transform: scale(1.1);
      box-shadow: 0 0 20px #4e0eff80;
      background-color: #4e0eff20;
    }
  }

  .submit-btn {
    background-color: #4e0eff;
    color: white;
    padding: 1rem 2rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 0.4rem;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: 0.3s ease-in-out;
    
    &:hover { 
        background-color: #997af0; 
        box-shadow: 0 0 20px #4e0eff60; 
        transform: translateY(-2px);
    }
  }
`;