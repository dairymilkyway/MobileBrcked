import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from './ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function UserHeader({ section = 'Home' }) {
  const router = useRouter();
  const colorScheme = useColorScheme();

  // LEGO studs for the top of bricks
  const renderStuds = (count: number) => {
    const studs = [];
    for (let i = 0; i < count; i++) {
      studs.push(
        <View key={i} style={styles.stud}>
          <View style={styles.studInner} />
        </View>
      );
    }
    return studs;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoShadow}>
              <MaterialCommunityIcons name="toy-brick" size={45} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.sectionText}>{section}</Text>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity 
            style={styles.legoButton}
            onPress={() => alert('Profile feature coming soon')}
          >
            <Image 
              source={{ uri: 'https://cdn.iconscout.com/icon/free/png-256/free-lego-figure-head-icon-download-in-svg-png-gif-file-formats--puzzle-game-baby-pack-people-icons-6805444.png' }}
              style={styles.legoHeadIcon}
            />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.legoButton, { backgroundColor: '#FFC500' }]}
            onPress={() => alert('Notifications feature coming soon')}
          >
            <IconSymbol 
              name="bell.fill" 
              size={22} 
              color="#FFFFFF" 
            />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.legoButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => alert('Cart feature coming soon')}
          >
            <IconSymbol 
              name="cart.fill" 
              size={22} 
              color="#FFFFFF" 
            />
            <View style={styles.buttonStud} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#E3000B', // LEGO red
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  topStudsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginTop: 2,
  },
  stud: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E3000B',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  studInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4000A',
  },
  brickStudsRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: -6,
    left: 2,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
    letterSpacing: 1,
    marginRight: 8,
  },
  sectionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
    textTransform: 'uppercase',
  },
  legoButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: '#006DB7', // LEGO blue
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000', // Black border
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  legoHeadIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF', // This will make the icon white
  },
  buttonStud: {
    position: 'absolute',
    top: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
    right: 13,
  },
  logoShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});