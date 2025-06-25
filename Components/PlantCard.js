// components/PlantCard.js
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const PlantCard = ({ plant, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={plant.image} style={styles.image} />
      <Text style={styles.name}>{plant.name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 120,
    marginRight: 10,
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  image: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 10 },
  name: { fontSize: 14, fontWeight: 'bold' },
});

export default PlantCard;
