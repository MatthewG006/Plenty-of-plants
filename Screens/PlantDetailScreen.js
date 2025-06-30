// screens/PlantDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PlantDetailScreen({ route }) {
  const { plant } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plant Detail</Text>
      {plant ? (
        <>
          <Text style={styles.detail}>ID: {plant.id}</Text>
          <Text style={styles.detail}>Name: {plant.name}</Text>
        </>
      ) : (
        <Text style={styles.detail}>No plant data found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  detail: {
    fontSize: 18,
    color: '#333',
  },
});
