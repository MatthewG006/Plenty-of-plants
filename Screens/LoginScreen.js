// screens/LoginScreen.js
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function LoginScreen({ navigation }) {
  const handleLogin = () => {
    navigation.replace('Main'); // Replace to prevent back navigation to login
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Screen</Text>
      <Button title="Login" onPress={handleLogin} />
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
    fontSize: 28,
    marginBottom: 20,
  },
});
