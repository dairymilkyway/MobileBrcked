import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import UserHeader from '@/components/UserHeader';
import { useNavigation } from '@react-navigation/native';

type PaymentMethod = 'gcash' | 'cod' | 'credit_card';

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  
  // Hide the default header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = () => {
    // Check if all required fields are filled
    const requiredFields = ['name', 'email', 'address', 'city', 'postalCode', 'phone'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    // Process the checkout
    Alert.alert(
      'Order Confirmed!', 
      'Your LEGO order has been placed successfully.',
      [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('home' as never)
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <UserHeader section="Checkout" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Personal Information Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.studRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.stud}>
                <View style={styles.studInner} />
              </View>
            ))}
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
            />
            
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your email"
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
            />
            
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
            />
          </View>
        </View>
        
        {/* Shipping Address Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.studRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.stud}>
                <View style={styles.studInner} />
              </View>
            ))}
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your street address"
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
            />
            
            <Text style={styles.inputLabel}>City *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your city"
              value={formData.city}
              onChangeText={(text) => handleInputChange('city', text)}
            />
            
            <Text style={styles.inputLabel}>Postal Code *</Text>
            <TextInput 
              style={styles.textInput}
              placeholder="Enter your postal code"
              keyboardType="numeric"
              value={formData.postalCode}
              onChangeText={(text) => handleInputChange('postalCode', text)}
            />
          </View>
        </View>
        
        {/* Order Summary Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.studRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.stud}>
                <View style={styles.studInner} />
              </View>
            ))}
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₱1,999.00</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping:</Text>
              <Text style={styles.summaryValue}>₱150.00</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax:</Text>
              <Text style={styles.summaryValue}>₱239.88</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₱2,388.88</Text>
            </View>
          </View>
        </View>
        
        {/* Payment Method Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.studRow}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.stud}>
                <View style={styles.studInner} />
              </View>
            ))}
          </View>
          
          <View style={styles.sectionContent}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            {/* GCash Option */}
            <TouchableOpacity 
              style={[
                styles.paymentOption, 
                paymentMethod === 'gcash' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('gcash')}
            >
              <MaterialCommunityIcons 
                name="cellphone" 
                size={24} 
                color={paymentMethod === 'gcash' ? "#0064C2" : "#666666"} 
              />
              <Text style={[
                styles.paymentText, 
                paymentMethod === 'gcash' && styles.paymentTextSelected
              ]}>GCash</Text>
              {paymentMethod === 'gcash' && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#0064C2" />
              )}
            </TouchableOpacity>
            
            {/* COD Option */}
            <TouchableOpacity 
              style={[
                styles.paymentOption, 
                paymentMethod === 'cod' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('cod')}
            >
              <MaterialCommunityIcons 
                name="cash" 
                size={24} 
                color={paymentMethod === 'cod' ? "#0064C2" : "#666666"} 
              />
              <Text style={[
                styles.paymentText, 
                paymentMethod === 'cod' && styles.paymentTextSelected
              ]}>Cash on Delivery</Text>
              {paymentMethod === 'cod' && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#0064C2" />
              )}
            </TouchableOpacity>
            
            {/* Credit Card Option */}
            <TouchableOpacity 
              style={[
                styles.paymentOption, 
                paymentMethod === 'credit_card' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('credit_card')}
            >
              <MaterialCommunityIcons 
                name="credit-card" 
                size={24} 
                color={paymentMethod === 'credit_card' ? "#0064C2" : "#666666"} 
              />
              <Text style={[
                styles.paymentText, 
                paymentMethod === 'credit_card' && styles.paymentTextSelected
              ]}>Credit Card</Text>
              {paymentMethod === 'credit_card' && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#0064C2" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>BACK</Text>
            <View style={styles.backButtonBottom} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.placeOrderButton}
            onPress={handleSubmit}
          >
            <Text style={styles.placeOrderText}>PLACE ORDER</Text>
            <View style={styles.placeOrderBottom} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  studRow: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#FFE500',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  stud: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD500',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderWidth: 1,
    borderColor: '#000000',
  },
  studInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFBD00',
  },
  sectionContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0C0A00',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333333',
  },
  textInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  paymentOptionSelected: {
    borderColor: '#0064C2',
    backgroundColor: '#E6F0FF',
  },
  paymentText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    color: '#333333',
  },
  paymentTextSelected: {
    color: '#0064C2',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    marginTop: 8,
  },
  backButton: {
    backgroundColor: '#666666',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    marginRight: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
    letterSpacing: 1,
  },
  backButtonBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#444444',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  placeOrderButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 60,
    flex: 1.5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    marginLeft: 8,
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.select({
      ios: 'Futura-Bold',
      android: 'sans-serif-condensed',
      default: 'System'
    }),
    letterSpacing: 1,
  },
  placeOrderBottom: {
    width: '94%',
    height: 6,
    backgroundColor: '#3D8B40',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333333',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    borderBottomWidth: 0,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0C0A00',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0064C2',
  },
});
