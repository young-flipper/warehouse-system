package com.warehouse.warehouse_system.controller;

import com.warehouse.warehouse_system.entity.Product;
import com.warehouse.warehouse_system.entity.Manufacturer;
import com.warehouse.warehouse_system.entity.ProductType;
import com.warehouse.warehouse_system.repository.ProductRepository;
import com.warehouse.warehouse_system.repository.ManufacturerRepository;
import com.warehouse.warehouse_system.repository.ProductTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:8000")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ManufacturerRepository manufacturerRepository;

    @Autowired
    private ProductTypeRepository productTypeRepository;

    // GET /api/products - получить товары с фильтрами, пагинацией и сортировкой по ID (по убыванию - новые первыми)
    @GetMapping
    public ResponseEntity<Map<String, Object>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String manufacturer,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice) {
        
        // Изменил ASC на DESC - новые товары будут первыми
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        
        // Создаем спецификацию для фильтров
        Specification<Product> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Фильтр по производителю
            if (manufacturer != null && !manufacturer.isEmpty()) {
                predicates.add(criteriaBuilder.equal(
                    root.get("manufacturer").get("name"), manufacturer
                ));
            }
            
            // Фильтр по типу товара
            if (type != null && !type.isEmpty()) {
                predicates.add(criteriaBuilder.equal(
                    root.get("type").get("name"), type
                ));
            }
            
            // Фильтр по минимальной цене
            if (minPrice != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                    root.get("price"), BigDecimal.valueOf(minPrice)
                ));
            }
            
            // Фильтр по максимальной цене
            if (maxPrice != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                    root.get("price"), BigDecimal.valueOf(maxPrice)
                ));
            }
            
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
        
        // Используем спецификацию с пагинацией
        Page<Product> productsPage = productRepository.findAll(spec, pageable);
        
        // Возвращаем полную информацию о пагинации
        Map<String, Object> response = new HashMap<>();
        response.put("products", productsPage.getContent());
        response.put("currentPage", productsPage.getNumber());
        response.put("totalItems", productsPage.getTotalElements());
        response.put("totalPages", productsPage.getTotalPages());
        response.put("pageSize", productsPage.getSize());
        
        System.out.println("📊 Пагинация: страница " + page + ", размер " + size + 
                         ", всего товаров: " + productsPage.getTotalElements() +
                         ", товаров на странице: " + productsPage.getContent().size());
        
        return ResponseEntity.ok(response);
    }

    // GET /api/products/{id} - получить товар по ID
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        System.out.println("🔹 Получен запрос на товар с ID: " + id);
        Optional<Product> product = productRepository.findById(id);
        if (product.isPresent()) {
            System.out.println("✅ Товар найден: " + product.get().getName());
            return ResponseEntity.ok(product.get());
        } else {
            System.out.println("❌ Товар не найден с ID: " + id);
            return ResponseEntity.notFound().build();
        }
    }

    // GET /api/products/dto/{id} - получить товар в формате DTO (для редактирования)
    @GetMapping("/dto/{id}")
    public ResponseEntity<Map<String, Object>> getProductDtoById(@PathVariable Long id) {
        System.out.println("🔹 Получен запрос на товар (DTO) с ID: " + id);
        Optional<Product> product = productRepository.findById(id);
        
        if (product.isPresent()) {
            Product p = product.get();
            Map<String, Object> dto = new HashMap<>();
            
            dto.put("id", p.getId());
            dto.put("name", p.getName());
            dto.put("description", p.getDescription());
            dto.put("price", p.getPrice());
            dto.put("quantity", p.getQuantity());
            
            // Критично для формы редактирования
            dto.put("manufacturer_id", p.getManufacturer() != null ? p.getManufacturer().getId() : null);
            dto.put("type_id", p.getType() != null ? p.getType().getId() : null);
            
            System.out.println("✅ Товар (DTO) найден: " + p.getName());
            return ResponseEntity.ok(dto);
        } else {
            System.out.println("❌ Товар не найден с ID: " + id);
            return ResponseEntity.notFound().build();
        }
    }

    // POST /api/products - создать новый товар
    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        System.out.println("🔹 Получен запрос на создание товара: " + product.getName());
        try {
            Product savedProduct = productRepository.save(product);
            System.out.println("✅ Товар создан: " + savedProduct.getName() + " (ID: " + savedProduct.getId() + ")");
            return ResponseEntity.ok(savedProduct);
        } catch (Exception e) {
            System.out.println("❌ Ошибка при создании товара: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // PUT /api/products/{id} - обновить товар
    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id, @RequestBody Product productDetails) {
        System.out.println("🔹 Получен запрос на обновление товара с ID: " + id);
        
        Optional<Product> productOptional = productRepository.findById(id);
        
        if (productOptional.isPresent()) {
            Product product = productOptional.get();
            System.out.println("🔹 Обновление товара: " + product.getName());
            
            product.setName(productDetails.getName());
            product.setDescription(productDetails.getDescription());
            product.setPrice(productDetails.getPrice());
            product.setQuantity(productDetails.getQuantity());
            
            // Обновляем связи
            if (productDetails.getManufacturer() != null) {
                product.setManufacturer(productDetails.getManufacturer());
            }
            if (productDetails.getType() != null) {
                product.setType(productDetails.getType());
            }
            
            Product updatedProduct = productRepository.save(product);
            System.out.println("✅ Товар обновлен: " + updatedProduct.getName());
            return ResponseEntity.ok(updatedProduct);
        } else {
            System.out.println("❌ Товар не найден для обновления с ID: " + id);
            return ResponseEntity.notFound().build();
        }
    }

    // DELETE /api/products/{id} - удалить товар
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        System.out.println("🔹 Получен запрос на удаление товара с ID: " + id);
        
        if (productRepository.existsById(id)) {
            productRepository.deleteById(id);
            System.out.println("✅ Товар удален с ID: " + id);
            return ResponseEntity.ok().build();
        } else {
            System.out.println("❌ Товар не найден для удаления с ID: " + id);
            return ResponseEntity.notFound().build();
        }
    }

    // GET /api/products/count - получить общее количество товаров
    @GetMapping("/count")
    public ResponseEntity<Long> getProductsCount() {
        long count = productRepository.count();
        System.out.println("📊 Всего товаров в БД: " + count);
        return ResponseEntity.ok(count);
    }

    // GET /api/products/filters/manufacturers - получить всех производителей
    @GetMapping("/filters/manufacturers")
    public ResponseEntity<List<Manufacturer>> getAllManufacturers() {
        System.out.println("🔹 Получен запрос на получение производителей");
        List<Manufacturer> manufacturers = manufacturerRepository.findAll();
        System.out.println("✅ Найдено производителей: " + manufacturers.size());
        return ResponseEntity.ok(manufacturers);
    }

    // GET /api/products/filters/types - получить все типы товаров
    @GetMapping("/filters/types")
    public ResponseEntity<List<ProductType>> getAllProductTypes() {
        System.out.println("🔹 Получен запрос на получение типов товаров");
        List<ProductType> types = productTypeRepository.findAll();
        System.out.println("✅ Найдено типов товаров: " + types.size());
        return ResponseEntity.ok(types);
    }
    
    // POST /api/products/manufacturers - создать производителя
    @PostMapping("/manufacturers")
    public ResponseEntity<Manufacturer> createManufacturer(@RequestBody Manufacturer manufacturer) {
        System.out.println("🔹 Создание производителя: " + manufacturer.getName());
        try {
            Manufacturer saved = manufacturerRepository.save(manufacturer);
            System.out.println("✅ Производитель создан: " + saved.getName());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            System.out.println("❌ Ошибка: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // DELETE /api/products/manufacturers/{id} - удалить производителя
    @DeleteMapping("/manufacturers/{id}")
    public ResponseEntity<Void> deleteManufacturer(@PathVariable Long id) {
        System.out.println("🔹 Удаление производителя ID: " + id);
        try {
            if (manufacturerRepository.existsById(id)) {
                manufacturerRepository.deleteById(id);
                System.out.println("✅ Производитель удален");
                return ResponseEntity.ok().build();
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            System.out.println("❌ Ошибка: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // POST /api/products/types - создать тип товара
    @PostMapping("/types")
    public ResponseEntity<ProductType> createProductType(@RequestBody ProductType productType) {
        System.out.println("🔹 Создание типа товара: " + productType.getName());
        try {
            ProductType saved = productTypeRepository.save(productType);
            System.out.println("✅ Тип товара создан: " + saved.getName());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            System.out.println("❌ Ошибка: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    // DELETE /api/products/types/{id} - удалить тип товара
    @DeleteMapping("/types/{id}")
    public ResponseEntity<Void> deleteProductType(@PathVariable Long id) {
        System.out.println("🔹 Удаление типа товара ID: " + id);
        try {
            if (productTypeRepository.existsById(id)) {
                productTypeRepository.deleteById(id);
                System.out.println("✅ Тип товара удален");
                return ResponseEntity.ok().build();
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            System.out.println("❌ Ошибка: " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}