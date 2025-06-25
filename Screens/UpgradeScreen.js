// screens/UpgradeScreen.js
import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GameContext } from '../context/GameContext';

const UpgradeScreen = () => {
  const { room, upgradeRoom, nutrients } = useContext(GameContext);

  // Define cost based on the current room level
  const upgradeCost = {
    basic: room.level * 5,
    advanced: room.level * 2,
    rare: room.level,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Room Upgrade</Text>
      <Text style={styles.info}>Current Room Level: {room.level}</Text>
      <Text style={styles.info}>Capacity: {room.capacity} plants</Text>
      <Text style={styles.sectionTitle}>Upgrade Cost:</Text>
      <Text>Basic Nutrients: {upgradeCost.basic}</Text>
      <Text>Advanced Nutrients: {upgradeCost.advanced}</Text>
      <Text>Rare Nutrients: {upgradeCost.rare}</Text>
      <Text style={styles.sectionTitle}>Your Nutrients:</Text>
      <Text>Basic: {nutrients.basic}</Text>
      <Text>Advanced: {nutrients.advanced}</Text>
      <Text>Rare: {nutrients.rare}</Text>
      <TouchableOpacity style={styles.button} onPress={() => upgradeRoom(upgradeCost)}>
        <Text style={styles.buttonText}>Upgrade Room</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  info: { fontSize: 18, marginVertical: 5 },
  sectionTitle: { fontSize: 20, marginTop: 15, fontWeight: 'bold' },
  button: { backgroundColor: '#FF5722', padding: 15, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18 },
});

export default UpgradeScreen;
