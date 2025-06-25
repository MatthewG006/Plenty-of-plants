// components/NutrientMeter.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NutrientMeter = ({ nutrients }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nutrients</Text>
      <View style={styles.nutrientRow}>
        <Text>Basic: {nutrients.basic}</Text>
        <Text>Advanced: {nutrients.advanced}</Text>
        <Text>Rare: {nutrients.rare}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 10, backgroundColor: '#E0F7FA', borderRadius: 8, marginVertical: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-around' },
});

export default NutrientMeter;
