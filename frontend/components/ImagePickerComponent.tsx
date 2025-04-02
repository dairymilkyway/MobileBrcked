import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Platform 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface ImagePickerComponentProps {
  images: any[];
  setImages: (images: any[]) => void;
  maxImages?: number;
}

const ImagePickerComponent: React.FC<ImagePickerComponentProps> = ({ 
  images, 
  setImages,
  maxImages = 5 
}) => {
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraRef, setCameraRef] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      // Request camera permissions
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === 'granted');
      
      // Request media library permissions
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus.status === 'granted');
    })();
  }, []);

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Maximum Images', `You can only upload ${maxImages} images`);
      return;
    }

    if (!hasGalleryPermission) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = result.assets[0];
        setImages([...images, newImage]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Maximum Images', `You can only upload ${maxImages} images`);
      return;
    }

    if (!hasCameraPermission) {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    if (!cameraRef) return;

    try {
      setLoading(true);
      const photo = await cameraRef.takePictureAsync({ quality: 0.7 });
      setImages([...images, photo]);
      setCameraVisible(false);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        {hasCameraPermission ? (
          <>
            <Camera
              style={styles.camera}
              type={CameraType.back}
              ref={(ref: Camera) => setCameraRef(ref)}
            />
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.button} 
                onPress={() => setCameraVisible(false)}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.captureButton]} 
                onPress={takePicture}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.messageContainer}>
            <Text style={styles.message}>No access to camera</Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setCameraVisible(false)}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        style={styles.imageScroll}
        showsHorizontalScrollIndicator={false}
      >
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image 
              source={{ uri: image.uri }} 
              style={styles.image} 
            />
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color="#E3000B" />
            </TouchableOpacity>
          </View>
        ))}
        
        {images.length < maxImages && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.pickButton, styles.galleryButton]} 
              onPress={pickImage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="images" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Gallery</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.pickButton, styles.cameraButton]} 
              onPress={() => setCameraVisible(true)}
              disabled={loading}
            >
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.buttonText}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      <Text style={styles.helperText}>
        {images.length} / {maxImages} images
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  imageScroll: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    margin: 5,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 15,
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    height: 100,
    width: 100,
  },
  pickButton: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  galleryButton: {
    backgroundColor: '#3498db',
  },
  cameraButton: {
    backgroundColor: '#2ecc71',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  cameraContainer: {
    flex: 1,
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  captureButton: {
    backgroundColor: '#E3000B',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#fff',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
});

export default ImagePickerComponent; 