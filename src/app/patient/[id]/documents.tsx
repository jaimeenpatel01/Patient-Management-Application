import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPatientDocuments, getDocumentUrl, deleteDocument } from '@/services/documentService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Document } from '@/types';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  xray: 'body-outline',
  mri: 'scan-outline',
  prescription: 'medical-outline',
  report: 'document-text-outline',
  progress_photo: 'image-outline',
  exercise_doc: 'fitness-outline',
  other: 'folder-outline',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function PatientDocumentsScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!patientId) return;
    const { data } = await getPatientDocuments(patientId);
    setDocuments(data);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadDocuments().finally(() => setIsLoading(false));
    }, [loadDocuments])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDocuments();
    setIsRefreshing(false);
  };

  const handleOpenDocument = async (doc: Document) => {
    const { url, error } = await getDocumentUrl(doc.storage_path);
    if (error || !url) {
      Alert.alert('Error', 'Could not retrieve document link. Make sure your Supabase Storage bucket is public or properly configured.');
      return;
    }
    // Open in browser/viewer
    Linking.openURL(url).catch((err) => {
      Alert.alert('Error', 'Could not open the file.');
    });
  };

  const handleDelete = (doc: Document) => {
    Alert.alert('Delete Document', `Are you sure you want to delete ${doc.file_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteDocument(doc.id, doc.storage_path);
          if (error) {
            Alert.alert('Error', error);
          } else {
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
          }
        },
      },
    ]);
  };

  const renderCard = ({ item }: { item: Document }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardContent} onPress={() => handleOpenDocument(item)} activeOpacity={0.7}>
        <View style={styles.iconContainer}>
          <Ionicons name={CATEGORY_ICONS[item.category || 'other']} size={24} color={Colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.fileName} numberOfLines={1}>{item.file_name}</Text>
          <Text style={styles.fileMeta}>
            {item.category?.replace('_', ' ').toUpperCase()} • {formatBytes(item.file_size)} • {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {item.notes && <Text style={styles.fileNotes} numberOfLines={1}>{item.notes}</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={20} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Documents & Media' }} />
      <View style={styles.container}>
        {documents.length === 0 ? (
          <EmptyState
            icon="images-outline"
            title="No Documents"
            subtitle="Upload X-rays, MRI scans, or medical reports for this patient."
            actionLabel="Upload File"
            onAction={() => router.push(`/patient/${patientId}/add-document` as any)}
          />
        ) : (
          <FlatList
            data={documents}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          />
        )}
        <TouchableOpacity style={styles.fab} onPress={() => router.push(`/patient/${patientId}/add-document` as any)} activeOpacity={0.8}>
          <Ionicons name="cloud-upload" size={24} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.base, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  cardContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.base,
  },
  iconContainer: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryFaded,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  textContainer: { flex: 1, marginRight: Spacing.sm },
  fileName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text, marginBottom: 2 },
  fileMeta: { fontSize: Typography.xs, color: Colors.textTertiary, fontWeight: Typography.medium },
  fileNotes: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 4 },
  deleteButton: { padding: Spacing.base, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.lg,
  },
});
