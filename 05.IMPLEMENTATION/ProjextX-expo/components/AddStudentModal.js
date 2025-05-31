import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/apiConfig';

const AddStudentModal = ({ visible, onClose, classId, classData, onStudentAdded }) => {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [activeField, setActiveField] = useState(null);

  const resetForm = () => {
    setStudentId('');
    setStudentName('');
    setSearchResults([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const searchStudents = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('Starting search for:', query);
      setIsSearching(true);

      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        console.log('No user token found');
        return;
      }

      const url = `${API_BASE_URL}/api/students/search?query=${encodeURIComponent(query)}`;
      console.log('Search URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Search response:', data);

      if (response.ok) {
        const results = Array.isArray(data) ? data : [];
        console.log('Setting search results:', results);
        setSearchResults(results);
      } else {
        console.error('Search failed:', response.status, data);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error during search:', error);
      setSearchResults([]);
    } finally {
      setTimeout(() => {
        setIsSearching(false);
      }, 500);
    }
  };

  const handleSearchInput = (text) => {
    console.log('Search input changed:', text);
    setStudentName(text);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (text.trim()) {
      console.log('Setting search timeout');
      const newTimeout = setTimeout(() => {
        searchStudents(text);
      }, 500);
      setSearchTimeout(newTimeout);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectStudent = (student) => {
    setStudentId(student.studentId || '');
    setStudentName(student.name || '');
    setSearchResults([]);
  };

  const handleAddStudent = async () => {
    if (!studentId.trim() || !studentName.trim()) {
      Alert.alert('Missing Information', 
        'Please fill in all required fields:\n\n' +
        (!studentId.trim() ? '• Student ID\n' : '') +
        (!studentName.trim() ? '• Student Name\n' : '')
      );
      return;
    }

    if (!classData || !classData._id) {
      Alert.alert('Error', 'Invalid class data. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (!userToken || !userData) {
        Alert.alert('Authentication Error', 'You must be logged in to add students');
        return;
      }

      const parsedUserData = JSON.parse(userData);
      const { lecturerId, name: lecturerName } = parsedUserData;

      // Generate timestamp for uniqueId
      const timestamp = Date.now();
      const uniqueId = `${studentId.trim()}_${classData.courseCode}_${timestamp}`;

      // Generate a default email if not provided
      const studentEmail = `${studentId.trim().toLowerCase()}@student.example.com`;

      const requestBody = {
        studentId: studentId.trim(),
        studentName: studentName.trim(),
        studentEmail, // Required by the server
        yearLevel: '1st Year',
        section: classData.section,
        courseCode: classData.courseCode,
        courseName: classData.courseName,
        room: classData.room,
        schedule: classData.schedule,
        lecturerId,
        lecturerName,
        date: new Date(),
        status: 'present',
        timestamp,
        uniqueId
      };

      console.log('Class Data:', classData);
      console.log('Sending request with body:', JSON.stringify(requestBody, null, 2));
      console.log('ClassId:', classData._id);
      console.log('API URL:', `${API_BASE_URL}/api/classes/${classData._id}/students`);

      const response = await fetch(`${API_BASE_URL}/api/classes/${classData._id}/students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        console.error('Server error details:', {
          status: response.status,
          statusText: response.statusText,
          data,
          requestBody
        });
        throw new Error(data.message || data.error || 'Failed to add student');
      }

      if (onStudentAdded) {
        onStudentAdded(data.classStudent);
      }

      handleClose();
      Alert.alert('Success', 'Student added successfully');
    } catch (error) {
      console.error('Error adding student:', {
        error: error.message,
        stack: error.stack,
        classData,
        studentId: studentId.trim()
      });
      Alert.alert(
        'Error',
        `Failed to add student. Please try again.\n\nDetails: ${error.message}\n\nPlease check the console for more information.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Add Student to Class</Text>
              <Text style={styles.modalSubtitle}>{classData?.courseCode} - {classData?.section}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.searchSection}>
              <Text style={styles.sectionTitle}>Search Existing Student</Text>
              <View style={[
                styles.inputContainer,
                activeField === 'search' && styles.inputContainerFocused
              ]}>
                <Ionicons name="search" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={studentName}
                  onChangeText={handleSearchInput}
                  placeholder="Search by name or student ID"
                  placeholderTextColor="#999"
                  onFocus={() => setActiveField('search')}
                  onBlur={() => setActiveField(null)}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color="#1B3358" style={styles.searchingSpinner} />
                )}
              </View>

              {searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  <Text style={styles.searchResultsTitle}>
                    Found {searchResults.length} student{searchResults.length === 1 ? '' : 's'}
                  </Text>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item._id || item.studentId}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectStudent(item)}
                    >
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultName}>{item.name}</Text>
                        <Text style={styles.searchResultDetails}>
                          ID: {item.studentId}
                        </Text>
                      </View>
                      <View style={styles.searchResultAction}>
                        <Ionicons name="add-circle" size={24} color="#1B3358" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Student Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Student ID</Text>
                <View style={[
                  styles.inputContainer,
                  activeField === 'id' && styles.inputContainerFocused
                ]}>
                  <Ionicons name="card" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={studentId}
                    onChangeText={setStudentId}
                    placeholder="Enter student ID"
                    placeholderTextColor="#999"
                    onFocus={() => setActiveField('id')}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={[
                  styles.inputContainer,
                  activeField === 'name' && styles.inputContainerFocused
                ]}>
                  <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={studentName}
                    onChangeText={setStudentName}
                    placeholder="Enter student name"
                    placeholderTextColor="#999"
                    onFocus={() => setActiveField('name')}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, (!studentId.trim() || !studentName.trim() || isLoading) && styles.addButtonDisabled]}
              onPress={handleAddStudent}
              disabled={!studentId.trim() || !studentName.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" style={styles.addButtonIcon} />
                  <Text style={styles.addButtonText}>Add Student</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  formContainer: {
    flex: 1,
  },
  searchSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  formSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderColor: '#1B3358',
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  searchingSpinner: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    marginTop: 16,
  },
  searchResultsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  searchResultDetails: {
    fontSize: 14,
    color: '#666',
  },
  searchResultAction: {
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1B3358',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#1B3358',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddStudentModal;
