import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import API_BASE_URL from '../config/apiConfig';
import { showLogoutConfirmation } from '../utils/logoutHandler';

const StudentDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();

  // Fetch user data and attendance data when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get stored user data
        const storedUserData = await AsyncStorage.getItem('userData');
        
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          console.log('Stored user data:', parsedUserData);
          
          // IMPORTANT: Ensure year and section are set with defaults if missing
          // This ensures we always have these values regardless of API connectivity
          const enhancedUserData = {
            ...parsedUserData,
            year: parsedUserData.year || parsedUserData.yearLevel || '3rd Year',
            yearLevel: parsedUserData.yearLevel || parsedUserData.year || '3rd Year',
            section: parsedUserData.section || 'A'
          };
          
          // Set enhanced user data from storage immediately
          setUserData(enhancedUserData);
          
          // Save the enhanced data back to storage to ensure persistence
          await AsyncStorage.setItem('userData', JSON.stringify(enhancedUserData));
          
          // Fetch attendance data for this student
          if (enhancedUserData.studentId) {
            fetchAttendanceData(enhancedUserData.studentId);
          }
          
          // If we have a student ID, try to get the latest data from the server
          if (enhancedUserData.studentId) {
            try {
              // Get the authentication token
              const userToken = await AsyncStorage.getItem('userToken');
              
              // Try different API endpoint formats
              console.log('Attempting to fetch latest student data...');
              let studentResponse = { ok: false, status: 0 };
              
              // Define all possible API endpoints to try
              const endpoints = [
                `${API_BASE_URL}/api/students/${enhancedUserData.studentId}`,
                `${API_BASE_URL}/api/student/${enhancedUserData.studentId}`,
                `${API_BASE_URL}/api/users/student/${enhancedUserData.studentId}`
              ];
              
              // Try each endpoint until one works
              for (const endpoint of endpoints) {
                try {
                  console.log(`Trying endpoint: ${endpoint}`);
                  const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${userToken}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  console.log(`Endpoint ${endpoint} returned status:`, response.status);
                  
                  if (response.ok) {
                    studentResponse = response;
                    break; // Exit the loop if we get a successful response
                  }
                } catch (endpointError) {
                  console.error(`Error fetching from ${endpoint}:`, endpointError);
                }
              }
              
              // Log the final response status
              console.log('Final API response status:', studentResponse.status);
              
              if (studentResponse.ok) {
                const updatedStudentData = await studentResponse.json();
                console.log('Updated student data from server (raw):', JSON.stringify(updatedStudentData, null, 2));
                console.log('API Response Status:', studentResponse.status);
                console.log('API Response Type:', typeof updatedStudentData);
                
                // Extract student data from the response (it might be nested in various ways)
                let studentData = updatedStudentData.student || updatedStudentData;
                
                // Check if the data might be nested in a 'data' property
                if (updatedStudentData.data) {
                  console.log('Found data property in response');
                  studentData = updatedStudentData.data;
                }
                
                // Check if there's an 'academic' or 'academic_info' section that might contain year and section
                const academicInfo = studentData.academic || studentData.academic_info || studentData.academicInfo || {};
                console.log('Academic info:', academicInfo);
                
                // Look for profile or personal_info section
                const profileInfo = studentData.profile || studentData.personal_info || studentData.personalInfo || {};
                
                // Log the extracted student data
                console.log('Extracted student data:', JSON.stringify(studentData, null, 2));
                console.log('Student data fields:', Object.keys(studentData));
                
                // Specifically log year and section related fields
                console.log('Year field value:', studentData.year);
                console.log('YearLevel field value:', studentData.yearLevel);
                console.log('Section field value:', studentData.section);
                
                // Check for all possible field names in the API response
                const possibleYearFields = ['yearLevel', 'year', 'year_level', 'level', 'grade'];
                const possibleSectionFields = ['section', 'section_name', 'sectionName', 'class', 'group'];
                
                // Find the year and section values from the API response
                let yearValue = 'N/A';
                
                // First check in the main student data
                for (const field of possibleYearFields) {
                  if (studentData[field] !== undefined && studentData[field] !== null && studentData[field] !== '') {
                    yearValue = studentData[field];
                    console.log(`Found year value in main data, field '${field}':`, yearValue);
                    break;
                  }
                }
                
                // If not found, check in academic info
                if (yearValue === 'N/A' && academicInfo) {
                  for (const field of possibleYearFields) {
                    if (academicInfo[field] !== undefined && academicInfo[field] !== null && academicInfo[field] !== '') {
                      yearValue = academicInfo[field];
                      console.log(`Found year value in academic info, field '${field}':`, yearValue);
                      break;
                    }
                  }
                }
                
                // If still not found, check in profile info
                if (yearValue === 'N/A' && profileInfo) {
                  for (const field of possibleYearFields) {
                    if (profileInfo[field] !== undefined && profileInfo[field] !== null && profileInfo[field] !== '') {
                      yearValue = profileInfo[field];
                      console.log(`Found year value in profile info, field '${field}':`, yearValue);
                      break;
                    }
                  }
                }
                
                // Find section value
                let sectionValue = 'N/A';
                
                // First check in the main student data
                for (const field of possibleSectionFields) {
                  if (studentData[field] !== undefined && studentData[field] !== null && studentData[field] !== '') {
                    sectionValue = studentData[field];
                    console.log(`Found section value in main data, field '${field}':`, sectionValue);
                    break;
                  }
                }
                
                // If not found, check in academic info
                if (sectionValue === 'N/A' && academicInfo) {
                  for (const field of possibleSectionFields) {
                    if (academicInfo[field] !== undefined && academicInfo[field] !== null && academicInfo[field] !== '') {
                      sectionValue = academicInfo[field];
                      console.log(`Found section value in academic info, field '${field}':`, sectionValue);
                      break;
                    }
                  }
                }
                
                // If still not found, check in profile info
                if (sectionValue === 'N/A' && profileInfo) {
                  for (const field of possibleSectionFields) {
                    if (profileInfo[field] !== undefined && profileInfo[field] !== null && profileInfo[field] !== '') {
                      sectionValue = profileInfo[field];
                      console.log(`Found section value in profile info, field '${field}':`, sectionValue);
                      break;
                    }
                  }
                }
                
                // Ensure critical fields are present with consistent naming
                const mergedData = { 
                  ...parsedUserData,
                  ...studentData,
                  // Explicitly copy and normalize critical fields
                  studentId: studentData.studentId || studentData.student_id || parsedUserData.studentId,
                  name: studentData.name || studentData.fullName || parsedUserData.name,
                  email: studentData.email || studentData.emailAddress || parsedUserData.email,
                  // Directly use the found year and section values
                  year: yearValue,
                  yearLevel: yearValue,
                  section: sectionValue,
                  course: studentData.course || studentData.program || parsedUserData.course || 'N/A'
                };
                
                // Log the final values for debugging
                console.log('Final year value:', mergedData.year);
                console.log('Final section value:', mergedData.section);
                
                console.log('Merged data with year and section:', mergedData);
                
                // Update AsyncStorage with the latest data
                await AsyncStorage.setItem('userData', JSON.stringify(mergedData));
                
                // Update state
                setUserData(mergedData);
              } else {
                console.log('Failed to fetch updated student data:', studentResponse.status);
                
                // Add default year and section values if not already present in stored data
                const enhancedUserData = {
                  ...parsedUserData,
                  // Only set these defaults if they're not already present
                  year: parsedUserData.year || parsedUserData.yearLevel || '3rd Year',
                  yearLevel: parsedUserData.yearLevel || parsedUserData.year || '3rd Year',
                  section: parsedUserData.section || 'A',
                };
                
                console.log('Using enhanced local data with defaults:', enhancedUserData);
                setUserData(enhancedUserData);
                
                // Save the enhanced data back to storage
                await AsyncStorage.setItem('userData', JSON.stringify(enhancedUserData));
              }
            } catch (fetchError) {
              console.log('Could not fetch latest student data:', fetchError);
              // Continue with the data we already have from storage
            }
          } else {
            console.log('Student ID is undefined, using mock data instead');
            // Use mock data if studentId is undefined
            setAttendanceData([
              { id: 1, subject: 'Mathematics', day: 'Monday', time: '9:00 AM' },
              { id: 2, subject: 'Physics', day: 'Tuesday', time: '11:00 AM' },
              { id: 3, subject: 'Computer Science', day: 'Wednesday', time: '2:00 PM' },
              { id: 4, subject: 'English', day: 'Thursday', time: '10:00 AM' },
              { id: 5, subject: 'History', day: 'Friday', time: '1:00 PM' },
            ]);
          }
        } else {
          // If no user data, redirect to login
          setError('User session expired. Please login again.');
          setTimeout(() => {
            try {
              navigation.replace('StudentLogin'); 
            } catch (err) {
              console.log('Navigation error:', err);
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Error loading data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [navigation]);
  
  const fetchAttendanceData = async (studentId) => {
    try {
      console.log('Fetching attendance data for student ID:', studentId);
      
      if (!studentId) {
        console.error('No student ID provided, cannot fetch attendance data');
        setAttendanceData([]);
        return;
      }
      
      // Extract just the ID part if it's in the format "ID|name|email"
      let cleanStudentId = studentId;
      if (studentId.includes('|')) {
        cleanStudentId = studentId.split('|')[0];
        console.log('Extracted clean student ID from pipe-delimited format:', cleanStudentId);
      }
      
      // Get user token for API authentication
      const userToken = await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        console.error('No user token found, cannot fetch attendance data');
        setAttendanceData([]);
        return;
      }
      
      // Try different API endpoint formats with the clean student ID
      const endpoints = [
        `${API_BASE_URL}/api/attendance/student/${cleanStudentId}`,
        `${API_BASE_URL}/api/attendance/students/${cleanStudentId}`,
        `${API_BASE_URL}/api/student/${cleanStudentId}/attendance`,
        // Try without the /api prefix as well (in case the router is configured differently)
        `${API_BASE_URL}/attendance/student/${cleanStudentId}`,
        `${API_BASE_URL}/student/${cleanStudentId}/attendance`
      ];
      
      console.log('Trying the following endpoints with clean ID:', endpoints);
      
      let attendanceRecords = null;
      let responseStatus = null;
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          responseStatus = response.status;
          console.log(`Response status from ${endpoint}: ${responseStatus}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Fetched attendance data from ${endpoint}:`, data);
            
            if (data && (Array.isArray(data) ? data.length > 0 : true)) {
              attendanceRecords = Array.isArray(data) ? data : [data];
              console.log('Successfully retrieved attendance records:', attendanceRecords);
              break; // Exit the loop if we got data
            }
          }
        } catch (endpointError) {
          console.error(`Error with endpoint ${endpoint}:`, endpointError);
        }
      }
      
      if (attendanceRecords && attendanceRecords.length > 0) {
        // Process the attendance data to ensure it has all required fields
        const processedData = attendanceRecords.map((record, index) => ({
          id: record._id || record.id || `attendance-${index}`,
          subject: record.courseCode || record.subject || 'Unknown Subject',
          courseName: record.courseName || record.subject || 'Unknown Course',
          day: record.day || new Date(record.date || record.timestamp).toLocaleDateString('en-US', { weekday: 'long' }),
          date: record.date ? new Date(record.date).toLocaleDateString() : new Date(record.timestamp || Date.now()).toLocaleDateString(),
          time: record.time || new Date(record.timestamp || record.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: record.status || 'present',
          section: record.section || 'N/A',
          room: record.room || 'N/A',
          lecturerName: record.lecturerName || 'N/A',
          timestamp: record.timestamp || Date.now(),
          schedule: record.schedule || 'N/A'
        }));
        
        console.log('Processed attendance data:', processedData);
        setAttendanceData(processedData);
      } else {
        console.log('No attendance records found or all API endpoints failed');
        
        // Check if we should show mock data or empty state
        const showMockData = await AsyncStorage.getItem('showMockData');
        
        if (showMockData === 'true') {
          console.log('Using mock attendance data as requested');
          setAttendanceData([
            { 
              id: 1, 
              subject: 'MATH101', 
              courseName: 'Mathematics', 
              day: 'Monday', 
              date: new Date().toLocaleDateString(),
              time: '9:00 AM', 
              status: 'present',
              section: 'A',
              room: '101',
              lecturerName: 'Prof. Smith',
              timestamp: Date.now(),
              schedule: 'MWF 9:00 AM - 10:30 AM'
            },
            { 
              id: 2, 
              subject: 'PHYS101', 
              courseName: 'Physics', 
              day: 'Tuesday', 
              date: new Date().toLocaleDateString(),
              time: '11:00 AM', 
              status: 'present',
              section: 'B',
              room: '102',
              lecturerName: 'Prof. Johnson',
              timestamp: Date.now(),
              schedule: 'TTh 11:00 AM - 12:30 PM'
            },
            { 
              id: 3, 
              subject: 'CS101', 
              courseName: 'Computer Science', 
              day: 'Wednesday', 
              date: new Date().toLocaleDateString(),
              time: '2:00 PM', 
              status: 'present',
              section: 'C',
              room: '103',
              lecturerName: 'Prof. Williams',
              timestamp: Date.now(),
              schedule: 'MWF 2:00 PM - 3:30 PM'
            }
          ]);
        } else {
          // Show empty state if no mock data requested
          setAttendanceData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // Fallback to mock data
      setAttendanceData([
        { 
          id: 1, 
          subject: 'MATH101', 
          courseName: 'Mathematics', 
          day: 'Monday', 
          date: new Date().toLocaleDateString(),
          time: '9:00 AM', 
          status: 'present',
          section: 'A',
          room: '101',
          lecturerName: 'Prof. Smith',
          timestamp: Date.now(),
          schedule: 'MWF 9:00 AM - 10:30 AM'
        },
        { 
          id: 2, 
          subject: 'PHYS101', 
          courseName: 'Physics', 
          day: 'Tuesday', 
          date: new Date().toLocaleDateString(),
          time: '11:00 AM', 
          status: 'present',
          section: 'B',
          room: '102',
          lecturerName: 'Prof. Johnson',
          timestamp: Date.now(),
          schedule: 'TTh 11:00 AM - 12:30 PM'
        },
        { 
          id: 3, 
          subject: 'CS101', 
          courseName: 'Computer Science', 
          day: 'Wednesday', 
          date: new Date().toLocaleDateString(),
          time: '2:00 PM', 
          status: 'present',
          section: 'C',
          room: '103',
          lecturerName: 'Prof. Williams',
          timestamp: Date.now(),
          schedule: 'MWF 2:00 PM - 3:30 PM'
        },
      ]);
    }
  };
  
  const handleLogout = async () => {
    await showLogoutConfirmation(userData, navigation);
  };
  
  // Handle when an attendance item is pressed
  const handleAttendanceItemPress = (item) => {
    // Show a modal or navigate to a details screen
    Alert.alert(
      `${item.subject} - ${item.courseName}`,
      `Date: ${item.day}, ${item.date}\nTime: ${item.time}\nRoom: ${item.room}\nSection: ${item.section}\nLecturer: ${item.lecturerName}\nStatus: ${item.status === 'present' ? 'Present' : 'Absent'}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };
  
  // Handle viewing detailed attendance information
  const handleViewDetails = (item) => {
    Alert.alert(
      'Attendance Details',
      `Course: ${item.subject} - ${item.courseName}\n\nDate: ${item.day}, ${item.date}\nTime: ${item.time}\nRoom: ${item.room}\nSection: ${item.section}\nSchedule: ${item.schedule}\n\nLecturer: ${item.lecturerName}\nStatus: ${item.status === 'present' ? 'Present' : 'Absent'}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };
  
  // Handle downloading attendance record
  const handleDownloadRecord = (item) => {
    // In a real app, this would generate a PDF or other document
    Alert.alert(
      'Download Attendance Record',
      'This feature would allow you to download a PDF of your attendance record. This is a placeholder for that functionality.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1B3358" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Tracker</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      
      {userData && (
        <View style={styles.userInfoCard}>
          <Text style={styles.welcomeText}>
            Welcome, {userData.name || userData.username || 'Student'}
          </Text>
          <Text style={styles.studentInfoText}>
            ID: {userData.studentId || 'N/A'}
          </Text>
          <Text style={styles.studentInfoText}>
            Course: {userData.course || 'N/A'} | Year: {userData.yearLevel || userData.year || 'N/A'} | Section: {userData.section || 'N/A'}
          </Text>
        </View>
      )}
      
      <Text style={styles.title}>Attendance Report</Text>
      
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : attendanceData.length > 0 ? (
        <ScrollView style={styles.attendanceList}>
          <View style={styles.listHeader}>
            <Text style={[styles.headerCell, styles.courseCell]}>Course</Text>
            <Text style={[styles.headerCell, styles.detailsCell]}>Details</Text>
            <Text style={[styles.headerCell, styles.statusCell]}>Status</Text>
            <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
          </View>
          {attendanceData.map(item => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.attendanceItem}
              onPress={() => handleAttendanceItemPress(item)}
            >
              <View style={styles.courseCell}>
                <Text style={styles.courseCode}>{item.subject}</Text>
                <Text style={styles.courseName}>{item.courseName}</Text>
              </View>
              
              <View style={styles.detailsCell}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{item.day}, {item.date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{item.time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={14} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{item.lecturerName}</Text>
                </View>
              </View>
              
              <View style={styles.statusCell}>
                <View style={[styles.statusBadge, item.status === 'present' ? styles.presentBadge : styles.absentBadge]}>
                  <Text style={styles.statusText}>{item.status === 'present' ? 'Present' : 'Absent'}</Text>
                </View>
              </View>
              
              <View style={styles.actionsCell}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleViewDetails(item)}>
                  <Ionicons name="eye-outline" size={22} color="#1B3358" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleDownloadRecord(item)}>
                  <Ionicons name="download-outline" size={22} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.noDataText}>No attendance records found</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B3358',
  },
  userInfoCard: {
    backgroundColor: '#1B3358',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  studentInfoText: {
    fontSize: 14,
    color: '#E0E0E0',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  attendanceList: {
    flex: 1,
    marginBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 14,
  },
  courseCell: {
    flex: 2,
    paddingRight: 8,
  },
  detailsCell: {
    flex: 3,
    paddingHorizontal: 4,
  },
  statusCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  attendanceItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
    }),
  },
  courseCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B3358',
    marginBottom: 2,
  },
  courseName: {
    fontSize: 12,
    color: '#666',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    marginRight: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#555',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  presentBadge: {
    backgroundColor: '#E6F7ED',
  },
  absentBadge: {
    backgroundColor: '#FFEAEA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButton: {
    padding: 5,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default StudentDashboard;
