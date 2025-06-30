// screens/HomeScreen.js
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const plants = [
  { id: 1, name: 'Aloe Vera' },
  { id: 2, name: 'Monstera Deliciosa' },
  { id: 3, name: 'Snake Plant' },
];

export default function HomeScreen() {
  const navigation = useNavigation();

  const goToPlantDetail = (plant) => {
    navigation.navigate('PlantDetail', { plant });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => goToPlantDetail(item)}
    >
      <Text style={styles.itemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Plants</Text>
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  itemContainer: {
    backgroundColor: '#cde',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemText: {
    fontSize: 18,
  },
});
