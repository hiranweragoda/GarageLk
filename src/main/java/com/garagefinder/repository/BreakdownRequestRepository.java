package com.garagefinder.repository;

import com.garagefinder.model.BreakdownRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BreakdownRequestRepository extends JpaRepository<BreakdownRequest, Long> {
    Optional<BreakdownRequest> findByBreakdownCode(String breakdownCode);
    long countByBreakdownCodeLike(String pattern);
    List<BreakdownRequest> findByCustomerIdOrderByCreatedTimeDesc(Long customerId);
    List<BreakdownRequest> findByStatusOrderByCreatedTimeDesc(String status);
    List<BreakdownRequest> findByLocationCityAndStatusOrderByCreatedTimeDesc(String locationCity, String status);
    List<BreakdownRequest> findByAssignedGarageId(Long assignedGarageId);
    List<BreakdownRequest> findByAssignedGarageIdIn(List<Long> assignedGarageIds);
}
