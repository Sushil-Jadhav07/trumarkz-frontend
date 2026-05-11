# TruMarkZ API Documentation

**Base URL:** `https://trumarkz-api-54038467488.asia-south1.run.app`  
**Version:** `1.0.0`  
**Authentication:** Bearer JWT Token  

---

# Overview

TruMarkZ API supports three user roles:

- `individual`
- `organization`
- `super_admin`

All protected endpoints require:

```http
Authorization: Bearer <access_token>
```
