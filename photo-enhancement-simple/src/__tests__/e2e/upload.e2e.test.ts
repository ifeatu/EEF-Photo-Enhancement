/**
 * End-to-end tests for file upload functionality
 * These tests simulate real user interactions with the upload interface
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Test configuration
test.describe('File Upload E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard page
    await page.goto('/dashboard');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display upload interface correctly', async ({ page }) => {
    // Check if the upload section is visible
    await expect(page.getByText('Enhance New Photo')).toBeVisible();
    
    // Check if the file input area is present
    await expect(page.locator('[data-testid="drop-zone"]')).toBeVisible();
    
    // Check if the "Choose File" button is present
    await expect(page.getByText('Choose File')).toBeVisible();
  });

  test('should handle file selection via file input', async ({ page }) => {
    // Create a test image file
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    
    // Find the file input (it might be hidden)
    const fileInput = page.locator('input[type="file"]');
    
    // Upload the file
    await fileInput.setInputFiles(testImagePath);
    
    // Verify that the file name appears in the UI
    await expect(page.getByText('test-image.jpg')).toBeVisible();
    
    // Check if upload button becomes enabled
    const uploadButton = page.getByText('Upload Photo');
    await expect(uploadButton).toBeEnabled();
  });

  test('should handle successful file upload', async ({ page }) => {
    // Mock the upload API to return success
    await page.route('/api/photos/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          photoId: 'test-photo-123',
          message: 'Photo uploaded successfully and queued for enhancement'
        })
      });
    });

    // Mock user credits API
    await page.route('/api/user/credits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ credits: 5 })
      });
    });

    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    const fileInput = page.locator('input[type="file"]');
    
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('test-image.jpg')).toBeVisible();
    
    // Click upload button
    const uploadButton = page.getByText('Upload Photo');
    await uploadButton.click();
    
    // Wait for success message
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle upload error gracefully', async ({ page }) => {
    // Mock the upload API to return an error
    await page.route('/api/photos/upload', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Upload failed'
        })
      });
    });

    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    const fileInput = page.locator('input[type="file"]');
    
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('test-image.jpg')).toBeVisible();
    
    const uploadButton = page.getByText('Upload Photo');
    await uploadButton.click();
    
    // Wait for error message
    await expect(page.getByText(/upload failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle insufficient credits', async ({ page }) => {
    // Mock user credits API to return 0 credits
    await page.route('/api/user/credits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ credits: 0 })
      });
    });

    // Mock the upload API to return insufficient credits error
    await page.route('/api/photos/upload', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Insufficient credits'
        })
      });
    });

    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    const fileInput = page.locator('input[type="file"]');
    
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('test-image.jpg')).toBeVisible();
    
    const uploadButton = page.getByText('Upload Photo');
    await uploadButton.click();
    
    // Wait for insufficient credits message
    await expect(page.getByText(/insufficient credits/i)).toBeVisible({ timeout: 10000 });
  });

  test('should validate file types', async ({ page }) => {
    // Create a test text file path (this would be a non-image file)
    const testTextPath = path.join(__dirname, '../fixtures/test-file.txt');
    
    const fileInput = page.locator('input[type="file"]');
    
    // Try to upload a non-image file
    await fileInput.setInputFiles(testTextPath);
    
    // Should show validation error
    await expect(page.getByText(/please select a valid image file/i)).toBeVisible();
  });

  test('should handle drag and drop upload', async ({ page }) => {
    // Mock successful upload
    await page.route('/api/photos/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          photoId: 'test-photo-123',
          message: 'Photo uploaded successfully and queued for enhancement'
        })
      });
    });

    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    const dropZone = page.locator('[data-testid="drop-zone"]');
    
    // Simulate drag and drop
    await dropZone.setInputFiles(testImagePath);
    
    // Verify file appears
    await expect(page.getByText('test-image.jpg')).toBeVisible();
    
    // Upload the file
    const uploadButton = page.getByText('Upload Photo');
    await uploadButton.click();
    
    // Wait for success message
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state during upload', async ({ page }) => {
    // Mock slow upload response
    await page.route('/api/photos/upload', async (route) => {
      // Delay the response to simulate slow upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          photoId: 'test-photo-123',
          message: 'Photo uploaded successfully and queued for enhancement'
        })
      });
    });

    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
    const fileInput = page.locator('input[type="file"]');
    
    await fileInput.setInputFiles(testImagePath);
    await expect(page.getByText('test-image.jpg')).toBeVisible();
    
    const uploadButton = page.getByText('Upload Photo');
    await uploadButton.click();
    
    // Check for loading state (button should be disabled or show loading text)
    await expect(uploadButton).toBeDisabled();
    
    // Wait for upload to complete
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible({ timeout: 15000 });
  });
});