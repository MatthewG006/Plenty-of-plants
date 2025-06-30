// screens/GachaScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GachaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gacha Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
  },
});
