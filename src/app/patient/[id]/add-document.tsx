import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadDocument } from '@/services/documentService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { DOCUMENT_CATEGORIES } from '@/constants/options';
import type { DocumentCategory } from '@/types';
import { useAlert } from '@/contexts/AlertContext';


export default function AddDocumentScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [category, setCategory] = useState<DocumentCategory>('other');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
    base64?: string;
  } | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Disabled due to native crop UI overlap with device controls
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uriParts = asset.uri.split('/');
      const fileName = asset.fileName || uriParts[uriParts.length - 1];
      
      setSelectedFile({
        uri: asset.uri,
        name: fileName,
        type: 'image/jpeg',
        size: asset.fileSize,
        base64: asset.base64 || undefined,
      });
      setErrors((prev) => ({ ...prev, file: '' }));
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });

        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size,
          base64: base64,
        });
        setErrors((prev) => ({ ...prev, file: '' }));
      }
    } catch (err: any) {
      showAlert('Error', `Could not pick document: ${err.message || err}`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedFile.base64) {
      setErrors({ file: 'Please select a file to upload.' });
      return;
    }
    if (!patientId) return;

    setIsSubmitting(true);
    const { error } = await uploadDocument({
      patient_id: patientId,
      file_name: selectedFile.name,
      file_type: selectedFile.type,
      file_size: selectedFile.size,
      base64Data: selectedFile.base64,
      category,
      notes: notes.trim() || null,
    });
    setIsSubmitting(false);

    if (error) {
      showAlert('Upload Failed', error);
    } else {
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.back();
      }, 1500);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Upload File' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>File</Text>
        
        {selectedFile ? (
          <View style={styles.selectedFileCard}>
            <View style={styles.selectedFileHeader}>
              <Ionicons 
                name={selectedFile.type.startsWith('image') ? 'image' : 'document-text'} 
                size={32} 
                color={Colors.primary} 
              />
              <View style={styles.selectedFileInfo}>
                <Text style={styles.selectedFileName} numberOfLines={1}>{selectedFile.name}</Text>
                <Text style={styles.selectedFileType}>
                  {selectedFile.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeFileBtn}>
                <Ionicons name="close-circle" size={24} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {selectedFile.type.startsWith('image') && (
              <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
            )}
          </View>
        ) : (
          <View style={styles.uploadOptions}>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <View style={styles.uploadIconContainer}>
                <Ionicons name="image-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.uploadBtnText}>Choose Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
              <View style={styles.uploadIconContainer}>
                <Ionicons name="document-outline" size={32} color={Colors.info} />
              </View>
              <Text style={styles.uploadBtnText}>Choose PDF/Doc</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Details</Text>
        
        <Text style={styles.fieldLabel}>Category</Text>
        <ChipSelector
          options={DOCUMENT_CATEGORIES}
          value={category}
          onChange={setCategory}
        />

        <Input 
          label="Notes (Optional)" 
          placeholder="Add any details about this file..." 
          value={notes} 
          onChangeText={setNotes} 
          multiline 
          numberOfLines={3} 
        />

        <View style={styles.submitContainer}>
          <Button 
            title="Upload File" 
            onPress={handleSubmit} 
            loading={isSubmitting} 
            icon={<Ionicons name="cloud-upload-outline" size={20} color={Colors.textInverse} />} 
          />
        </View>

      </ScrollView>

      <SuccessModal 
        visible={showSuccessModal} 
        message="File uploaded successfully." 
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.base },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.text, marginBottom: Spacing.sm },
  uploadOptions: { flexDirection: 'row', gap: Spacing.md },
  uploadBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
  },
  uploadIconContainer: { marginBottom: Spacing.sm },
  uploadBtnText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  selectedFileCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  selectedFileHeader: { flexDirection: 'row', alignItems: 'center' },
  selectedFileInfo: { flex: 1, marginLeft: Spacing.md },
  selectedFileName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text },
  selectedFileType: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  removeFileBtn: { padding: Spacing.xs },
  previewImage: { width: '100%', height: 200, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  errorText: { fontSize: Typography.sm, color: Colors.error, marginTop: Spacing.sm },
  submitContainer: { marginTop: Spacing.lg },
});
