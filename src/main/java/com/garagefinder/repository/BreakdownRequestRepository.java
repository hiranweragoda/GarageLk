package com.garagefinder.repository;

import com.garagefinder.model.BreakdownRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BreakdownRequestRepository extends JpaRepository<BreakdownRequest, Long> {
    List<BreakdownRequest> findByCustomerIdOrderByCreatedTimeDesc(Long customerId);
    List<BreakdownRequest> findByStatusOrderByCreatedTimeDesc(String status);
    List<BreakdownRequest> findByLocationCityAndStatusOrderByCreatedTimeDesc(String locationCity, String status);
    List<BreakdownRequest> findByAssignedGarageId(Long assignedGarageId);
    List<BreakdownRequest> findByAssignedGarageIdIn(List<Long> assignedGarageIds);
}
