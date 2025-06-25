// screens/GachaScreen.js
import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { GameContext } from '../context/GameContext';

const plantPool = [
  {
    id: '3',
    name: 'Rose',
    image: require('../assets/images/rose.png'),
    description: 'A rose, symbol of love.',
  },
  {
    id: '4',
    name: 'Tulip',
    image: require('../assets/images/tulip.png'),
    description: 'A tulip for spring vibes.',
  },
  {
    id: '5',
    name: 'Orchid',
    image: require('../assets/images/orchid.png'),
    description: 'A rare and exquisite orchid.',
  },
];

const GachaScreen = () => {
  const { addPlant, addNutrients, addCommunityPost } = useContext(GameContext);
  const [gachaResult, setGachaResult] = useState(null);

  const doGachaRoll = () => {
    // For this demonstration, choose a random plant from the pool
    const randomIndex = Math.floor(Math.random() * plantPool.length);
    const result = plantPool[randomIndex];
    setGachaResult(result);
    addPlant(result);
    // Reward a small nutrient bonus for rolling
    addNutrients('basic', 1);
    // Automatically post rare plants (for example, Orchid) to the community showcase
    if (result.name === 'Orchid') {
      addCommunityPost(result);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gacha Roll</Text>
      {gachaResult ? (
        <>
          <Image source={gachaResult.image} style={styles.plantImage} />
          <Text style={styles.plantName}>{gachaResult.name}</Text>
          <Text style={styles.description}>{gachaResult.description}</Text>
        </>
      ) : (
        <Text>Roll the gacha to get a new plant!</Text>
      )}
      <TouchableOpacity style={styles.button} onPress={doGachaRoll}>
        <Text style={styles.buttonText}>Roll Gacha</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  plantImage: { width: 150, height: 150, resizeMode: 'contain', marginVertical: 20 },
  plantName: { fontSize: 22, fontWeight: 'bold' },
  description: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18 },
});

export default GachaScreen;
