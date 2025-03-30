import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminSidebar from '@/components/AdminSidebar';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function ProductsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {!isTablet && <AdminSidebar />}
      
      <View style={styles.content}>
        <Text style={styles.title}>Products Management</Text>
        <Text style={styles.subtitle}>Coming soon: Manage your LEGO product catalog</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFFBB',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
});
