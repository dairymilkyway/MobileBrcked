import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProductsSection() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Products Management</Text>
            <Text style={styles.subtitle}>Manage your LEGO product catalog</Text>
          </View>
          
          <View style={styles.placeholderContainer}>
            <MaterialCommunityIcons name="toy-brick-outline" size={80} color="#c4181840" />
            <Text style={styles.placeholderTitle}>Coming soon</Text>
            <Text style={styles.description}>
              This section will allow you to add, edit, and manage your product inventory.
              You'll be able to upload images, set prices, and track stock levels.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginVertical: 20,
  },
  placeholderTitle: {
    fontSize: 18,
    color: '#333333',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  }
}); 