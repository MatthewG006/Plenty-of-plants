// screens/HomeScreen.js
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameContext } from '../context/GameContext';
import PlantCard from '../components/PlantCard';
import NutrientMeter from '../components/NutrientMeter';

const freePlants = [
  {
    id: '1',
    name: 'Cactus',
    image: require('../assets/images/cactus.png'),
    description: 'I thrive with little water!',
  },
  {
    id: '2',
    name: 'Fern',
    image: require('../assets/images/fern.png'),
    description: 'I love moisture.',
  },
];

const HomeScreen = ({ navigation }) => {
  const { plants, addPlant, nutrients } = useContext(GameContext);
  const [lastClaimed, setLastClaimed] = useState(null);

  const loadDailyClaim = async () => {
    try {
      const lastClaimedDate = await AsyncStorage.getItem('lastClaimed');
      if (lastClaimedDate) {
        setLastClaimed(new Date(lastClaimedDate));
      }
    } catch (error) {
      console.error('Error loading claim date:', error);
    }
  };

  useEffect(() => {
    loadDailyClaim();
  }, []);

  const handleClaimPlants = async () => {
    const today = new Date();
    if (lastClaimed) {
      const lastDate = new Date(lastClaimed);
      if (lastDate.toDateString() === today.toDateString()) {
        alert('You already claimed your free plants today!');
        return;
      }
    }
    // Add the free plants to the player's collection
    freePlants.forEach((plant) => addPlant(plant));
    await AsyncStorage.setItem('lastClaimed', today.toISOString());
    setLastClaimed(today);
  };

  const renderPlant = ({ item }) => (
    <PlantCard
      plant={item}
      onPress={() => navigation.navigate('PlantDetail', { plant: item })}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Virtual Room</Text>
      <Button title="Claim Daily Free Plants" onPress={handleClaimPlants} />
      <NutrientMeter nutrients={nutrients} />
      <FlatList
        data={plants}
        renderItem={renderPlant}
        keyExtractor={(item, index) => index.toString()}
        horizontal
        style={styles.plantList}
      />
      <Text style={styles.instructions}>
        Tap on a plant to interact, water, or upgrade!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  plantList: { marginVertical: 20 },
  instructions: { textAlign: 'center', color: '#555' },
});

export default HomeScreen;
