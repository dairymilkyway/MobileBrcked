import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, Easing, Dimensions, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();
  const [buttonScale] = useState(new Animated.Value(1));
  
  // Animation for floating bricks
  const floatingBricks = useRef(
    [...Array(6)].map(() => ({
      position: new Animated.ValueXY({ 
        x: Math.random() * width, 
        y: Math.random() * height * 0.5 + height * 0.25 
      }),
      rotation: new Animated.Value(Math.random() * 360),
      scale: new Animated.Value(0.5 + Math.random() * 0.5),
      color: ['#F8F32B', '#F54545', '#2E90E5', '#3EC65E', '#FF8C01', '#FFFFFF'][Math.floor(Math.random() * 6)]
    }))
  ).current;

  // Animation for stud highlights
  const studHighlight = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Animate the stud highlights
    Animated.loop(
      Animated.sequence([
        Animated.timing(studHighlight, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease)
        }),
        Animated.timing(studHighlight, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease)
        })
      ])
    ).start();

    // Animate each floating brick
    floatingBricks.forEach((brick) => {
      // Random movement parameters
      const xDestination = Math.random() * width;
      const yDestination = Math.random() * height * 0.5 + height * 0.25;
      const duration = 10000 + Math.random() * 20000;
      const rotationAmount = Math.random() > 0.5 ? 360 : -360;

      // Create animation sequence
      const animateBrick = () => {
        Animated.parallel([
          Animated.timing(brick.position, {
            toValue: { x: xDestination, y: yDestination },
            duration: duration,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic)
          }),
          Animated.timing(brick.rotation, {
            toValue: brick.rotation._value + rotationAmount,
            duration: duration,
            useNativeDriver: true,
            easing: Easing.linear
          })
        ]).start(() => {
          // Reset position and start new animation
          brick.position.setValue({ 
            x: Math.random() * width, 
            y: Math.random() * height * 0.5 + height * 0.25 
          });
          animateBrick();
        });
      };

      animateBrick();
    });

    return () => {
      // Clean up animations when component unmounts
      floatingBricks.forEach(brick => {
        brick.position.stopAnimation();
        brick.rotation.stopAnimation();
        brick.scale.stopAnimation();
      });
      studHighlight.stopAnimation();
    };
  }, []);

  const handleGetStarted = () => {
    // Button press animation with LEGO "clicking" effect
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.elastic(1.5)
      })
    ]).start(() => {
      router.push('/Login');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFF12B" barStyle="dark-content" />
      
      {/* LEGO baseplate background */}
      <View style={styles.baseplate}>
        {[...Array(10)].map((_, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.studRow}>
            {[...Array(6)].map((_, colIndex) => (
              <Animated.View 
                key={`stud-${rowIndex}-${colIndex}`} 
                style={[
                  styles.stud,
                  {
                    shadowOpacity: studHighlight.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, ((rowIndex + colIndex) % 2 === 0) ? 0.5 : 0.2]
                    })
                  }
                ]} 
              />
            ))}
          </View>
        ))}
      </View>
      
      {/* Floating bricks background */}
      {floatingBricks.map((brick, index) => (
        <Animated.View
          key={`floating-brick-${index}`}
          style={[
            styles.floatingBrick,
            {
              backgroundColor: brick.color,
              width: [90, 60, 40, 80][index % 4],
              height: 35,
              transform: [
                { translateX: brick.position.x },
                { translateY: brick.position.y },
                { rotate: brick.rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg']
                })},
                { scale: brick.scale }
              ]
            }
          ]}
        >
          {[...Array(index % 4 + 1)].map((_, studIndex) => (
            <View 
              key={`stud-${index}-${studIndex}`} 
              style={styles.brickStud} 
            />
          ))}
        </Animated.View>
      ))}
      
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBlock}>
            <MaterialCommunityIcons name="toy-brick" size={60} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>BRCKD</Text>
        </View>
        
        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>Build Your World</Text>
          <Text style={styles.subtitle}>One brick at a time</Text>
          
          {/* Stacked LEGO bricks illustration */}
          <View style={styles.brickStack}>
            <View style={[styles.stackedBrick, { backgroundColor: '#F54545', bottom: 0 }]}>
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
            </View>
            <View style={[styles.stackedBrick, { backgroundColor: '#2E90E5', bottom: 28 }]}>
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
            </View>
            <View style={[styles.stackedBrick, { backgroundColor: '#F8F12B', bottom: 56 }]}>
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
            </View>
            <View style={[styles.stackedBrick, { backgroundColor: '#3EC65E', bottom: 84 }]}>
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
              <View style={styles.brickStudLarge} />
            </View>
          </View>
          
          {/* Button */}
          <Animated.View style={[{ transform: [{ scale: buttonScale }] }]}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleGetStarted} 
              activeOpacity={0.9}
            >
              <View style={styles.buttonTop}>
                <Text style={styles.buttonText}>BUILD NOW</Text>
              </View>
              <View style={styles.buttonBottom} />
            </TouchableOpacity>
          </Animated.View>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.minifigurePart, styles.minifigureHead]} />
          <View style={[styles.minifigurePart, styles.minifigureTorso]} />
          <View style={[styles.minifigurePart, styles.minifigureLegs]} />
        </View>
      </View>
      
      {/* LEGO copyright-style wording */}
      <Text style={styles.copyright}>BRCKD™ is a trademark of Your Company</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F12B',
  },
  baseplate: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.7,
  },
  studRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: height * 0.09,
  },
  stud: {
    width: 30,
    height: 15,
    borderRadius: 15,
    backgroundColor: '#F8F12B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  floatingBrick: {
    position: 'absolute',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  brickStud: {
    width: 14,
    height: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBlock: {
    width: 70,
    height: 70,
    backgroundColor: '#F54545',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#262626',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  mainContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Futura-CondensedExtraBold' : 'normal',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 50,
    opacity: 0.8,
    textAlign: 'center',
  },
  brickStack: {
    height: 150,
    width: 200,
    marginVertical: 30,
    position: 'relative',
  },
  stackedBrick: {
    position: 'absolute',
    width: 200,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 5,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 8,
  },
  brickStudLarge: {
    width: 20,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    marginTop: 40,
    width: 200,
    height: 60,
    position: 'relative',
  },
  buttonTop: {
    width: 200,
    height: 50,
    backgroundColor: '#F54545',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 6,
  },
  buttonBottom: {
    width: 190,
    height: 10,
    backgroundColor: '#D13535',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    position: 'absolute',
    bottom: 0,
    left: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 20,
  },
  minifigurePart: {
    backgroundColor: '#F8F12B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  minifigureHead: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    marginRight: -2,
    zIndex: 3,
  },
  minifigureTorso: {
    width: 35,
    height: 40,
    borderRadius: 5,
    zIndex: 2,
  },
  minifigureLegs: {
    width: 25,
    height: 20,
    borderTopRightRadius: 5,
    marginLeft: -2,
    zIndex: 1,
  },
  copyright: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontSize: 10,
    color: '#262626',
    opacity: 0.6,
  }
});