import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl, 
  Alert,
  Modal,
  TextInput,
  FlatList,
  Button,
  Pressable,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router'; 
import API_BASE_URL from '../config/apiConfig';
import CreateClassModal from '../components/CreateClassModal';
import AddStudentModal from '../components/AddStudentModal';
import { showConfirmation } from '../utils/alertConfirmation';



const ClassesScreen = () => {
  const [classes, setClasses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    sortBy: 'courseCode', // 'courseCode', 'courseName', 'schedule'
    filterDay: 'all' // 'all', 'M', 'T', 'W', 'Th', 'F', 'S', 'Su'
  });
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedClassForStudent, setSelectedClassForStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('classes');
  
  const navigation = useNavigation();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setRefreshing(true);
      
      // Get authentication data
      const userToken = await AsyncStorage.getItem('userToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      console.log('Loading classes with stored data:', {
        hasToken: !!userToken,
        userData: storedUserData ? JSON.parse(storedUserData) : null
      });
      
      if (userToken && storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        
        if (parsedData.lecturerId) {
          console.log('Making API request for lecturer:', parsedData.lecturerId);
          
          // Fetch classes directly from MongoDB via API
          const response = await fetch(`${API_BASE_URL}/api/classes/lecturer/${parsedData.lecturerId}`, {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('API response data:', {
              dataType: typeof data,
              isArray: Array.isArray(data),
              length: Array.isArray(data) ? data.length : 'not an array',
              data: data
            });
            
            const fetchedClasses = data.classes || data;
            console.log('Processed classes:', {
              length: fetchedClasses.length,
              classes: fetchedClasses
            });
            
            // Fetch student lists for each class
            const classesWithStudents = await Promise.all(fetchedClasses.map(async (classItem) => {
              try {
                const studentsResponse = await fetch(`${API_BASE_URL}/api/classes/${classItem._id}/students`, {
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (studentsResponse.ok) {
                  const studentList = await studentsResponse.json();
                  return {
                    ...classItem,
                    studentList,
                    students: studentList.length
                  };
                }
                return classItem;
              } catch (error) {np
                console.error(`Error fetching students for class ${classItem._id}:`, error);
                return classItem;
              }
            }));
            
            // Update state with fetched classes including student lists
            setClasses(classesWithStudents || []);
          } else {
            console.error('Failed to fetch classes:', response.status);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            
            Alert.alert(
              'Error',
              'Failed to fetch classes from the server. Please try again later.'
            );
            setClasses([]);
          }
        } else {
          console.error('No lecturer ID found in stored data');
          Alert.alert(
            'Error',
            'Your account information is incomplete. Please log in again.'
          );
          setClasses([]);
        }
      } else {
        console.error('Missing authentication data:', {
          hasToken: !!userToken,
          hasUserData: !!storedUserData
        });
        Alert.alert(
          'Authentication Error',
          'Please log in to view your classes.'
        );
        setClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert(
        'Error',
        'An error occurred while fetching your classes. Please try again.'
      );
      setClasses([]);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle class creation
  const handleClassCreated = async (newClass) => {
    try {
      console.log('New class created:', newClass);
      
      // Add the new class to the local state
      setClasses(prevClasses => [...prevClasses, newClass]);
      
      // Close the modal
      setShowCreateClassModal(false);
      
      // Refresh the class list to ensure we have the latest data
      await loadClasses();
    } catch (error) {
      console.error('Error handling new class:', error);
      Alert.alert(
        'Error',
        'The class was created but there was an error updating the display. Please refresh the page.'
      );
    }
  };
  
  const handleClassPress = (classItem) => {
    setSelectedClass(classItem);
    setShowClassDetailsModal(true);
  };
  
  
  const handleDeleteClass = async (classId) => {
    try {
      const classToDelete = classes.find(c => c._id === classId);
      if (!classToDelete) {
        throw new Error('Class not found');
      }

      // Add debug logging for authentication data
      const userToken = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const parsedUserData = userData ? JSON.parse(userData) : null;
      
      console.log('Delete Class Debug:', {
        hasToken: !!userToken,
        tokenPreview: userToken ? `${userToken.substring(0, 10)}...` : null,
        userData: parsedUserData,
        classToDelete: {
          id: classToDelete._id,
          courseCode: classToDelete.courseCode,
          lecturerId: classToDelete.lecturerId
        }
      });

      if (!userToken || !parsedUserData) {
        console.error('Missing authentication data');
        throw new Error('You need to be logged in to delete a class. Please log in again.');
      }

      const confirmed = await showConfirmation({
        title: 'Delete Class',
        message: `Are you sure you want to delete this class?\n\nClass Details:\n` +
          `• Course: ${classToDelete.courseCode} - ${classToDelete.courseName}\n` +
          `• Section: ${classToDelete.section}\n` +
          `• Schedule: ${classToDelete.schedule}\n\n` +
          'This action will:\n' +
          '• Delete all class information\n' +
          '• Remove all enrolled students\n' +
          '• Delete all attendance records\n\n' +
          'This action cannot be undone.',
        onConfirm: async () => {
          console.log('Making delete request with:', {
            url: `${API_BASE_URL}/api/classes/${classId}`,
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });

          const response = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });

          let errorMessage = 'Failed to delete class';
          if (!response.ok) {
            const responseText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(responseText);
              console.error('Delete class error response:', {
                status: response.status,
                statusText: response.statusText,
                errorData
              });
              errorMessage = errorData.message || errorData.error || errorMessage;
              
              if (response.status === 403) {
                errorMessage = `Permission denied. ${errorData.details ? `\n\nDetails:\n` +
                  `• Your Role: ${errorData.details.userRole}\n` +
                  `• Required Role: ${errorData.details.requiredRole}\n` +
                  `• Your Lecturer ID: ${errorData.details.userLecturerId}\n` +
                  `• Class Lecturer ID: ${errorData.details.classLecturerId}` : ''}`;
              }
            } catch (e) {
              console.error('Error parsing error response:', responseText);
              errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
          }

          // Remove the class from the local state
          setClasses(prevClasses => prevClasses.filter(c => c._id !== classId));
          
          // Close the class details modal
          setShowClassDetailsModal(false);
          
          // Show success message
          if (Platform.OS === 'web') {
            window.alert('Class deleted successfully');
          } else {
            Alert.alert('Success', 'Class has been deleted successfully');
          }
        }
      });

      if (confirmed) {
        console.log('Class deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting class:', {
        error: error.message,
        stack: error.stack,
        classId
      });
      
      const errorMessage = error.message || 'An unexpected error occurred while deleting the class';
      
      if (Platform.OS === 'web') {
        window.alert('Failed to delete class: ' + errorMessage);
      } else {
        Alert.alert(
          'Error',
          'Failed to delete class: ' + errorMessage,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    }
  };
  
  const handleTakeAttendance = async (classItem) => {
    try {
      console.log('Taking attendance for class:', classItem);
      
      // Store the complete class data in AsyncStorage for the scanner to access
      // This ensures all class details are available for attendance records
      await AsyncStorage.setItem('currentClass', JSON.stringify(classItem));
      
      // Get lecturer data to include with attendance
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        console.log('Storing lecturer data for attendance:', parsedUserData);
        
        // Store the complete lecturer data to ensure all information is available
        // This is important for properly recording the lecturer in attendance records
        await AsyncStorage.setItem('lecturerData', JSON.stringify({
          // Store all possible ID fields
          id: parsedUserData.lecturerId || parsedUserData._id || parsedUserData.id,
          _id: parsedUserData._id || parsedUserData.lecturerId || parsedUserData.id,
          lecturerId: parsedUserData.lecturerId || parsedUserData._id || parsedUserData.id,
          // Store all possible name fields
          name: parsedUserData.name || parsedUserData.fullName || parsedUserData.lecturerName,
          fullName: parsedUserData.fullName || parsedUserData.name || parsedUserData.lecturerName,
          // Store additional lecturer information if available
          email: parsedUserData.email || parsedUserData.emailAddress,
          department: parsedUserData.department,
          // Store the original data as well for reference
          originalData: parsedUserData
        }));
      } else {
        console.warn('No lecturer data found in AsyncStorage');
      }
      
      // Close the modal first
      setShowClassDetailsModal(false);
      
      // Navigate to the scanner screen
      router.push('/(lecturer)/scanner');
    } catch (error) {
      console.error('Error navigating to scanner:', error);
      Alert.alert('Error', 'Could not open the attendance scanner. Please try again.');
    }
  };
  
  const handleAddStudent = (classItem) => {
    console.log('Adding student to class:', classItem);
    setSelectedClassForStudent(classItem);
    setShowAddStudentModal(true);
  };

  const handleStudentAdded = async (newStudent) => {
    console.log('Student added:', newStudent);
    
    // Close the modals first
    setShowAddStudentModal(false);
    setSelectedClassForStudent(null);
    
    // Show success message
    Alert.alert('Success', `Student ${newStudent.studentName} has been added to the class.`);
    
    // Reload all classes to get updated data
    await loadClasses();
  };
  
  const getFilteredClasses = () => {
    // First apply search filter
    let filteredClasses = classes.filter(c => 
      c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.room.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Then apply day filter
    if (filters.filterDay !== 'all') {
      filteredClasses = filteredClasses.filter(c => 
        c.schedule && c.schedule.includes(filters.filterDay)
      );
    }
    
    // Then sort
    return filteredClasses.sort((a, b) => {
      if (filters.sortBy === 'courseCode') {
        return a.courseCode.localeCompare(b.courseCode);
      } else if (filters.sortBy === 'courseName') {
        return a.courseName.localeCompare(b.courseName);
      } else if (filters.sortBy === 'schedule') {
        return a.schedule.localeCompare(b.schedule);
      }
      return 0;
    });
  };
  
  const renderFilterModal = () => {
    return (
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filters.sortBy === 'courseCode' && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({...filters, sortBy: 'courseCode'})}
                >
                  <Text style={filters.sortBy === 'courseCode' ? styles.filterOptionTextSelected : styles.filterOptionText}>
                    Course Code
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filters.sortBy === 'courseName' && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({...filters, sortBy: 'courseName'})}
                >
                  <Text style={filters.sortBy === 'courseName' ? styles.filterOptionTextSelected : styles.filterOptionText}>
                    Course Name
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filters.sortBy === 'schedule' && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({...filters, sortBy: 'schedule'})}
                >
                  <Text style={filters.sortBy === 'schedule' ? styles.filterOptionTextSelected : styles.filterOptionText}>
                    Schedule
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Filter by Day</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filters.filterDay === 'all' && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({...filters, filterDay: 'all'})}
                >
                  <Text style={filters.filterDay === 'all' ? styles.filterOptionTextSelected : styles.filterOptionText}>
                    All Days
                  </Text>
                </TouchableOpacity>
                
                {['M', 'T', 'W', 'Th', 'F'].map(day => (
                  <TouchableOpacity 
                    key={day}
                    style={[
                      styles.filterDayOption, 
                      filters.filterDay === day && styles.filterOptionSelected
                    ]}
                    onPress={() => setFilters({...filters, filterDay: day})}
                  >
                    <Text style={filters.filterDay === day ? styles.filterOptionTextSelected : styles.filterOptionText}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.applyFilterButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderClassCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.classCard}
      onPress={() => handleClassPress(item)}
    >
      <View style={styles.classCardHeader}>
        <Text style={styles.classCardCode}>{item.courseCode}</Text>
        <View style={styles.classCardBadge}>
          <Text style={styles.classCardBadgeText}>
            {item.students || 0} Students
          </Text>
        </View>
      </View>
      
      <Text style={styles.classCardName}>{item.courseName}</Text>
      <Text style={styles.classCardSection}>Section {item.section}</Text>
      
      <View style={styles.classCardDetails}>
        <View style={styles.classCardDetailItem}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.classCardDetailText}>{item.room}</Text>
        </View>
        
        <View style={styles.classCardDetailItem}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.classCardDetailText}>{item.schedule}</Text>
        </View>
      </View>
      
      <View style={styles.classCardActions}>
        <TouchableOpacity 
          style={styles.classCardAction}
          onPress={(e) => {
            e.stopPropagation();
            handleAddStudent(item);
          }}
        >
          <Ionicons name="person-add-outline" size={16} color="#1B3358" />
          <Text style={styles.classCardActionText}>Add Student</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.classCardAction}
          onPress={(e) => {
            e.stopPropagation();
            handleTakeAttendance(item);
          }}
        >
          <Ionicons name="scan-outline" size={16} color="#1B3358" />
          <Text style={styles.classCardActionText}>Take Attendance</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  const testAlert = () => {
    console.log('Test alert function called');
    Alert.alert(
      'Test Alert',
      'This is a test alert',
      [
        { text: 'OK', onPress: () => console.log('OK Pressed') }
      ]
    );
  };

  const handleRemoveStudent = async (classId, studentId) => {
    try {
      const classData = classes.find(c => c._id === classId);
      const student = classData?.students?.find(s => s._id === studentId);
      
      if (!classData || !student) {
        throw new Error('Class or student not found');
      }

      const confirmed = await showConfirmation({
        title: 'Remove Student',
        message: `Are you sure you want to remove this student?\n\nStudent Details:\n` +
          `• Name: ${student.name}\n` +
          `• ID: ${student.studentId}\n` +
          `• Course: ${classData.courseCode}\n\n` +
          'This action will:\n' +
          '• Remove the student from this class\n' +
          '• Delete their attendance records for this class\n\n' +
          'This action cannot be undone.',
        onConfirm: async () => {
          const userToken = await AsyncStorage.getItem('userToken');
          
          if (!userToken) {
            throw new Error('Authentication required. Please login again.');
          }

          const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/students/${studentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to remove student from class');
          }

          // Update the local state to remove the student
          setClasses(prevClasses => 
            prevClasses.map(c => {
              if (c._id === classId) {
                return {
                  ...c,
                  students: c.students.filter(s => s._id !== studentId)
                };
              }
              return c;
            })
          );
        }
      });

      if (confirmed) {
        // Student was successfully removed
        console.log('Student removed successfully');
      }
    } catch (error) {
      console.error('Error removing student:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to remove student: ' + error.message);
      } else {
        Alert.alert('Error', 'Failed to remove student: ' + error.message);
      }
    }
  };

  const renderStudentItem = ({ item: student }) => (
    <View style={styles.studentItem}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.studentName}</Text>
        <Text style={styles.studentId}>ID: {student.studentId}</Text>
        <Text style={styles.enrollmentDate}>
          Enrolled: {new Date(student.enrolledAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Pressable
          onPress={() => {
            Alert.alert(
              'Remove Student',
              `Are you sure you want to remove ${student.studentName} from this class?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Remove', 
                  style: 'destructive', 
                  onPress: () => handleRemoveStudent(student)
                }
              ]
            );
          }}
          style={({ pressed }) => [
            styles.removeButton,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderClassDetailsModal = () => {
    if (!selectedClass) return null;
    
    return (
      <Modal
        visible={showClassDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowClassDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.classDetailsContainer}>
            <View style={styles.classDetailsHeader}>
              <Text style={styles.classDetailsTitle}>{selectedClass.courseCode}</Text>
              <TouchableOpacity onPress={() => setShowClassDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.classDetailsContent}>
              <Text style={styles.classDetailsCourseName}>{selectedClass.courseName}</Text>
              <Text style={styles.classDetailsSection}>Section {selectedClass.section}</Text>
              
              <View style={styles.classDetailsInfoRow}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.classDetailsInfoText}>{selectedClass.room}</Text>
              </View>
              
              <View style={styles.classDetailsInfoRow}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.classDetailsInfoText}>{selectedClass.schedule}</Text>
              </View>
              
              <View style={styles.classDetailsInfoRow}>
                <Ionicons name="people-outline" size={20} color="#666" />
                <Text style={styles.classDetailsInfoText}>{selectedClass.students || 0} Students</Text>
              </View>
              
              {/* Student List Section */}
              <View style={styles.studentListContainer}>
                <Text style={styles.studentListTitle}>Enrolled Students</Text>
                {selectedClass.studentList && selectedClass.studentList.length > 0 ? (
                  selectedClass.studentList.map((student) => (
                    <View key={student.studentId} style={styles.studentItem}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.studentName}</Text>
                        <Text style={styles.studentId}>ID: {student.studentId}</Text>
                        <Text style={styles.enrollmentDate}>
                          Enrolled: {new Date(student.enrolledAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.buttonContainer}>
                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              'Remove Student',
                              `Are you sure you want to remove ${student.studentName} from this class?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                  text: 'Remove', 
                                  style: 'destructive', 
                                  onPress: () => handleRemoveStudent(selectedClass._id, student._id)
                                }
                              ]
                            );
                          }}
                          style={({ pressed }) => [
                            styles.removeButton,
                            { opacity: pressed ? 0.7 : 1 }
                          ]}
                        >
                          <Text style={styles.removeButtonText}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noStudentsText}>No students enrolled yet</Text>
                )}
              </View>
              
              {selectedClass.description && (
                <View style={styles.classDetailsDescriptionContainer}>
                  <Text style={styles.classDetailsDescriptionTitle}>Description</Text>
                  <Text style={styles.classDetailsDescriptionText}>{selectedClass.description}</Text>
                </View>
              )}
              
              <View style={styles.classDetailsActions}>
                <TouchableOpacity 
                  style={[styles.classDetailsActionButton, styles.addStudentButton]}
                  onPress={() => {
                    setShowClassDetailsModal(false);
                    handleAddStudent(selectedClass);
                  }}
                >
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.classDetailsActionButtonText}>Add Student</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.classDetailsActionButton}
                  onPress={() => handleTakeAttendance(selectedClass)}
                >
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                  <Text style={styles.classDetailsActionButtonText}>Take Attendance</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.classDetailsActionButton, styles.classDetailsDeleteButton]}
                  onPress={() => handleDeleteClass(selectedClass._id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.classDetailsActionButtonText}>Delete Class</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <FlatList
          data={getFilteredClasses()}
          renderItem={renderClassCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadClasses} />
          }
          ListHeaderComponent={
            <>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search classes..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={() => setFilterModalVisible(true)}
                >
                  <Ionicons name="filter" size={24} color="#1B3358" />
                </TouchableOpacity>
              </View>
              <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>My Classes</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowCreateClassModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#1B3358" />
                </TouchableOpacity>
              </View>
            </>
          }
        />
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'home' && styles.activeTabItem]}
          onPress={() => router.push('/(lecturer)/dashboard')}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={24}
            color={activeTab === 'home' ? '#1B3358' : '#666'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'home' && styles.activeTabLabel
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'classes' && styles.activeTabItem]}
          onPress={() => {}}
        >
          <Ionicons
            name={activeTab === 'classes' ? 'book' : 'book-outline'}
            size={24}
            color={activeTab === 'classes' ? '#1B3358' : '#666'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'classes' && styles.activeTabLabel
            ]}
          >
            Classes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'camera' && styles.activeTabItem]}
          onPress={() => router.push('/(lecturer)/scanner')}
        >
          <Ionicons
            name={activeTab === 'camera' ? 'camera' : 'camera-outline'}
            size={24}
            color={activeTab === 'camera' ? '#1B3358' : '#666'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'camera' && styles.activeTabLabel
            ]}
          >
            Camera
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.activeTabItem]}
          onPress={() => router.push('/(lecturer)/profile')}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={24}
            color={activeTab === 'profile' ? '#1B3358' : '#666'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'profile' && styles.activeTabLabel
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {renderFilterModal()}
      {renderClassDetailsModal()}
      
      <CreateClassModal
        visible={showCreateClassModal}
        onClose={() => setShowCreateClassModal(false)}
        onClassCreated={handleClassCreated}
      />
      
      <AddStudentModal
        visible={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        onStudentAdded={handleStudentAdded}
        classData={selectedClassForStudent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 60, // Space for the tab bar
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    height: 60,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px -2px 3px rgba(0, 0, 0, 0.1)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 8,
    }),
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabItem: {
    borderTopWidth: 3,
    borderTopColor: '#1B3358',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 2,
    color: '#666',
  },
  activeTabLabel: {
    color: '#1B3358',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterButton: {
    padding: 8,
    marginLeft: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  addButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  classCardCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  classCardBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  classCardBadgeText: {
    fontSize: 12,
    color: '#1B3358',
    fontWeight: '500',
  },
  classCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  classCardSection: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  classCardDetails: {
    marginBottom: 12,
  },
  classCardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  classCardDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  classCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  classCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  classCardActionText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#1B3358',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3358',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyCreateButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 30,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  filterDayOption: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#1B3358',
  },
  filterOptionText: {
    color: '#666',
  },
  filterOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  applyFilterButton: {
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  applyFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  classDetailsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '80%',
  },
  classDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  classDetailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  classDetailsContent: {
    padding: 16,
  },
  classDetailsCourseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  classDetailsSection: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  classDetailsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  classDetailsInfoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  classDetailsDescriptionContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  classDetailsDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  classDetailsDescriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  classDetailsActions: {
    marginTop: 24,
  },
  classDetailsActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B3358',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  classDetailsDeleteButton: {
    backgroundColor: '#FF6B6B',
  },
  classDetailsActionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  addStudentButton: {
    backgroundColor: '#4CAF50',
    marginBottom: 12,
  },
  studentListContainer: {
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  studentListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B3358',
    marginBottom: 16,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  studentInfo: {
    flex: 1,
    marginRight: 15,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  enrollmentDate: {
    fontSize: 12,
    color: '#999',
  },
  noStudentsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  removeButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ClassesScreen;
