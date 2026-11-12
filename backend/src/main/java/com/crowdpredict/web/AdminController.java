package com.crowdpredict.web;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.crowdpredict.service.AdminService;
import com.crowdpredict.service.DatasetService;
import com.crowdpredict.service.TrainingService;
import com.crowdpredict.web.dto.AdminStatsResponse;
import com.crowdpredict.web.dto.DatasetResponse;
import com.crowdpredict.web.dto.ModelMetricsResponse;
import com.crowdpredict.web.dto.ModelResponse;
import com.crowdpredict.web.dto.RoleUpdateRequest;
import com.crowdpredict.web.dto.StatusUpdateRequest;
import com.crowdpredict.web.dto.TrainModelRequest;
import com.crowdpredict.web.dto.UserResponse;

/** All admin screens live under {@code /api/admin}. Access is enforced in the services. */
@RestController
public class AdminController {

    private final AdminService adminService;
    private final DatasetService datasetService;
    private final TrainingService trainingService;

    public AdminController(AdminService adminService,
                           DatasetService datasetService,
                           TrainingService trainingService) {
        this.adminService = adminService;
        this.datasetService = datasetService;
        this.trainingService = trainingService;
    }

    @GetMapping("/api/admin/stats")
    public AdminStatsResponse stats() {
        return adminService.stats();
    }

    @GetMapping("/api/admin/datasets")
    public List<DatasetResponse> datasets() {
        return datasetService.list();
    }

    @PostMapping(value = "/api/admin/datasets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DatasetResponse> uploadDataset(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(datasetService.upload(file));
    }

    @DeleteMapping("/api/admin/datasets/{datasetId}")
    public Map<String, Object> deleteDataset(@PathVariable Long datasetId) {
        return datasetService.delete(datasetId);
    }

    @GetMapping("/api/admin/models")
    public List<ModelResponse> models() {
        return trainingService.list();
    }

    @PostMapping("/api/admin/models/train")
    public ResponseEntity<ModelResponse> train(@RequestBody TrainModelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(trainingService.train(request));
    }

    @GetMapping("/api/admin/models/{modelId}/metrics")
    public ModelMetricsResponse metrics(@PathVariable Long modelId) {
        return trainingService.metrics(modelId);
    }

    @PatchMapping("/api/admin/models/{modelId}/activate")
    public ModelResponse activate(@PathVariable Long modelId) {
        return trainingService.activate(modelId);
    }

    @GetMapping("/api/admin/users")
    public List<UserResponse> users(@RequestParam(required = false) String search) {
        return adminService.users(search);
    }

    @PatchMapping("/api/admin/users/{userId}/role")
    public UserResponse updateRole(@PathVariable Long userId, @RequestBody RoleUpdateRequest request) {
        return adminService.updateRole(userId, request);
    }

    @PatchMapping("/api/admin/users/{userId}/status")
    public UserResponse updateStatus(@PathVariable Long userId, @RequestBody StatusUpdateRequest request) {
        return adminService.updateStatus(userId, request);
    }
}
