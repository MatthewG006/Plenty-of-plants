// screens/UpgradeScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function UpgradeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade Screen</Text>
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
