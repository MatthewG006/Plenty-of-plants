import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet } from 'react-native';

const PlantDetailScreen = ({ route }) => {
  const { plant } = route.params;
  const [watered, setWatered] = useState(false);

  const handleWaterPlant = () => {
    setWatered(true);
    alert(`${plant.name} says "Thank you for watering me! :)"`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{plant.name}</Text>
      <Image source={plant.image} style={styles.image} />
      <Text style={styles.description}>{plant.description}</Text>
      <Button title="Water Plant" onPress={handleWaterPlant} />
      {watered && (
        <Text style={styles.nutrientMsg}>I feel nourished! :)</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20 
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20
  },
  image: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 15
  },
  description: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center'
  },
  nutrientMsg: {
    fontSize: 18,
    marginTop: 15,
    color: 'green'
  }
});

export default PlantDetailScreen;
