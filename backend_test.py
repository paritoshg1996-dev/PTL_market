#!/usr/bin/env python3
"""
Backend API Tests for Firebase Phone Authentication
Tests the /api/auth/verify-token endpoint and existing endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8001/api"

def test_root_endpoint():
    """Test GET /api/ returns correct message"""
    print("\n=== Test 1: GET /api/ ===")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Truck Load Marketplace API":
                print("✅ PASS: Root endpoint working correctly")
                return True
            else:
                print(f"❌ FAIL: Expected message 'Truck Load Marketplace API', got {data}")
                return False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def test_pincode_endpoint():
    """Test GET /api/pincode/400703 returns valid pincode info"""
    print("\n=== Test 2: GET /api/pincode/400703 ===")
    try:
        response = requests.get(f"{BASE_URL}/pincode/400703", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("pincode") == "400703" and data.get("valid") is True:
                print("✅ PASS: Pincode endpoint working correctly")
                return True
            else:
                print(f"❌ FAIL: Expected valid pincode data, got {data}")
                return False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def test_verify_token_empty_body():
    """Test POST /api/auth/verify-token with empty body {} - should return 422"""
    print("\n=== Test 3: POST /api/auth/verify-token with empty body {} ===")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-token",
            json={},
            timeout=5
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 422:
            print("✅ PASS: Empty body correctly returns 422 validation error")
            return True
        else:
            print(f"❌ FAIL: Expected status 422, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def test_verify_token_empty_string():
    """Test POST /api/auth/verify-token with {"id_token":""} - should return 400"""
    print("\n=== Test 4: POST /api/auth/verify-token with empty id_token ===")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-token",
            json={"id_token": ""},
            timeout=5
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 400:
            data = response.json()
            if data.get("detail") == "id_token is required":
                print("✅ PASS: Empty id_token correctly returns 400 with correct message")
                return True
            else:
                print(f"❌ FAIL: Expected detail 'id_token is required', got {data.get('detail')}")
                return False
        else:
            print(f"❌ FAIL: Expected status 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def test_verify_token_invalid_garbage():
    """Test POST /api/auth/verify-token with invalid garbage token - should return 401"""
    print("\n=== Test 5: POST /api/auth/verify-token with invalid garbage token ===")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/verify-token",
            json={"id_token": "invalid-garbage"},
            timeout=5
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 401:
            data = response.json()
            if data.get("detail") == "Invalid token":
                print("✅ PASS: Invalid garbage token correctly returns 401 with 'Invalid token'")
                return True
            else:
                print(f"❌ FAIL: Expected detail 'Invalid token', got {data.get('detail')}")
                return False
        else:
            print(f"❌ FAIL: Expected status 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def test_verify_token_wellformed_jwt():
    """Test POST /api/auth/verify-token with well-formed JWT (not Firebase) - should return 401"""
    print("\n=== Test 6: POST /api/auth/verify-token with well-formed JWT (not Firebase) ===")
    try:
        # This is a well-formed JWT but not a real Firebase token
        fake_jwt = "eyJhbGciOiJIUzI1NiJ9.aGVsbG8.signature"
        response = requests.post(
            f"{BASE_URL}/auth/verify-token",
            json={"id_token": fake_jwt},
            timeout=5
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 401:
            print("✅ PASS: Well-formed JWT (not Firebase) correctly returns 401")
            return True
        else:
            print(f"❌ FAIL: Expected status 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def main():
    print("=" * 80)
    print("BACKEND API TESTS - Firebase Phone Authentication")
    print("=" * 80)
    
    results = []
    
    # Test existing endpoints first
    results.append(("GET /api/", test_root_endpoint()))
    results.append(("GET /api/pincode/400703", test_pincode_endpoint()))
    
    # Test new Firebase auth endpoint
    results.append(("POST /api/auth/verify-token (empty body)", test_verify_token_empty_body()))
    results.append(("POST /api/auth/verify-token (empty id_token)", test_verify_token_empty_string()))
    results.append(("POST /api/auth/verify-token (invalid garbage)", test_verify_token_invalid_garbage()))
    results.append(("POST /api/auth/verify-token (well-formed JWT)", test_verify_token_wellformed_jwt()))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    print("=" * 80)
    
    return passed == total


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
