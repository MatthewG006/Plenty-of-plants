// screens/CommunityScreen.js
import React, { useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { GameContext } from '../context/GameContext';

const CommunityScreen = () => {
  const { communityPosts, upvoteCommunityPost } = useContext(GameContext);

  const renderPost = ({ item, index }) => (
    <View style={styles.postContainer}>
      <Image source={item.plant.image} style={styles.plantImage} />
      <View style={styles.postDetails}>
        <Text style={styles.plantName}>{item.plant.name}</Text>
        <Text style={styles.description}>{item.plant.description}</Text>
        <View style={styles.upvoteSection}>
          <Text style={styles.likes}>{item.likes} Likes</Text>
          <TouchableOpacity onPress={() => upvoteCommunityPost(index)} style={styles.upvoteButton}>
            <Text style={styles.upvoteText}>Upvote</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community Showcase</Text>
      {communityPosts.length === 0 ? (
        <Text>No community posts yet. Roll a rare plant to shine!</Text>
      ) : (
        <FlatList data={communityPosts} renderItem={renderPost} keyExtractor={(item, index) => index.toString()} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  postContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, marginBottom: 10, borderRadius: 8, elevation: 2 },
  plantImage: { width: 80, height: 80, resizeMode: 'contain', marginRight: 10 },
  postDetails: { flex: 1 },
  plantName: { fontSize: 18, fontWeight: 'bold' },
  description: { fontSize: 14, color: '#555' },
  upvoteSection: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  likes: { fontSize: 16, marginRight: 10 },
  upvoteButton: { backgroundColor: '#2196F3', padding: 5, borderRadius: 5 },
  upvoteText: { color: '#fff' },
});

export default CommunityScreen;
