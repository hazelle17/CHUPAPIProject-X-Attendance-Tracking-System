import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import API_BASE_URL from '../config/apiConfig';

const AddLecturerForm = ({ visible, onClose, onAddLecturer }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newLecturer, setNewLecturer] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    specialization: '',
    contactNumber: '',
  });

  const handleAddLecturer = async () => {
    // Basic validation
    if (!newLecturer.name || !newLecturer.email || !newLecturer.password || !newLecturer.department) {
      setError('Please fill in all required fields');
      return;
    }

    if (newLecturer.password !== newLecturer.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      // Prepare the request payload
      const requestPayload = {
        username: newLecturer.email,
        email: newLecturer.email,
        password: newLecturer.password,
        name: newLecturer.name,
        department: newLecturer.department,
        specialization: newLecturer.specialization || '',
        contactNumber: newLecturer.contactNumber || '',
      };

      // Make the API call to save the lecturer
      const response = await fetch(`${API_BASE_URL}/api/auth/lecturer/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to register lecturer');
      }

      // Reset form
      setNewLecturer({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        department: '',
        specialization: '',
        contactNumber: '',
      });

      // Call the onAddLecturer callback with the response data
      onAddLecturer(data);
      onClose();
    } catch (error) {
      console.error('Error adding lecturer:', error);
      setError(error.message || 'Failed to add lecturer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <Text style={styles.modalTitle}>Add New Lecturer</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={newLecturer.name}
              onChangeText={(text) => setNewLecturer({ ...newLecturer, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newLecturer.email}
              onChangeText={(text) => setNewLecturer({ ...newLecturer, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={newLecturer.password}
              onChangeText={(text) => setNewLecturer({ ...newLecturer, password: text })}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={newLecturer.confirmPassword}
              onChangeText={(text) => setNewLecturer({ ...newLecturer, confirmPassword: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder="Department"
              value={newLecturer.department}
              onChangeText={(text) => setNewLecturer({ ...newLecturer, department: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Specialization"
              value={newLecturer.specialization}
              onChangeText={(text) => setNewLecturer({ ...newLecturer, specialization: text })}
            />

            <TextInput
              style={styles.input}
              placeholder="Contact Number"
              value={newLecturer.contactNumber}
              onChangeText={(text) => setNewLecturer({ ...newLecturer, contactNumber: text })}
              keyboardType="phone-pad"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleAddLecturer}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Lecturer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingBottom: 20,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#1B3358',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1B3358',
  },
});

export default AddLecturerForm; 