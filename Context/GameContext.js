// context/GameContext.js
import React, { createContext, useState } from 'react';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  // Global state
  const [plants, setPlants] = useState([]); // Player’s plant collection
  const [nutrients, setNutrients] = useState({
    basic: 0,
    advanced: 0,
    rare: 0,
  });
  const [room, setRoom] = useState({
    level: 1,
    capacity: 5, // Initial capacity for plants
  });
  const [communityPosts, setCommunityPosts] = useState([]); // Community showcase posts

  // Add a plant if the room is not full
  const addPlant = (plant) => {
    if (plants.length < room.capacity) {
      setPlants([...plants, plant]);
    } else {
      alert("Your room is full! Upgrade your room to add more plants.");
    }
  };

  // Upgrade room if the player has enough nutrients.
  // For simplicity, the upgrade cost increases with the current room level.
  const upgradeRoom = (cost) => {
    if (
      nutrients.basic >= cost.basic &&
      nutrients.advanced >= cost.advanced &&
      nutrients.rare >= cost.rare
    ) {
      setNutrients({
        basic: nutrients.basic - cost.basic,
        advanced: nutrients.advanced - cost.advanced,
        rare: nutrients.rare - cost.rare,
      });
      setRoom({
        level: room.level + 1,
        capacity: room.capacity + 5, // Each upgrade increases capacity by 5
      });
    } else {
      alert("Not enough nutrients to upgrade!");
    }
  };

  // Add nutrients of a given type
  const addNutrients = (type, amount) => {
    setNutrients({ ...nutrients, [type]: nutrients[type] + amount });
  };

  // Upvote a post in the community showcase
  const upvoteCommunityPost = (index) => {
    const posts = [...communityPosts];
    posts[index].likes += 1;
    setCommunityPosts(posts);
  };

  // Add a community post (for example, automatically add rare plants)
  const addCommunityPost = (plant) => {
    setCommunityPosts([{ plant, likes: 0 }, ...communityPosts]);
  };

  return (
    <GameContext.Provider
      value={{
        plants,
        addPlant,
        nutrients,
        addNutrients,
        room,
        upgradeRoom,
        communityPosts,
        upvoteCommunityPost,
        addCommunityPost,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
