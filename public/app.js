 let baseLat = 21.02851; 
        let baseLng = 105.85444;
        let map, driverMarker, polyline;
        let intervalId = null;
        let trackPath = []; 
        const orderId = "DH-2026";

        function initMap() {
            map = L.map('map').setView([baseLat, baseLng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);

            L.marker([baseLat, baseLng]).addTo(map).bindPopup('Nhà Hàng').openPopup();
            
            polyline = L.polyline([], {color: '#3182ce', weight: 4}).addTo(map);
        }
        initMap();

        // Connect to WebSocket
        const socket = io('https://trackingservice-d6bf.onrender.com');
        socket.on('connect', () => {
            socket.emit('join_order_track', { orderId: orderId, role: 'customer' });
        });

        socket.on('tracking_updated', (data) => {
            const logBox = document.getElementById('customerLog');
            const timeStr = data.timestamp.split('T')[1].slice(0,8);
            
            logBox.innerHTML += `[${timeStr}]Nhận Event [${data.status}]<br>`;
            logBox.scrollTop = logBox.scrollHeight;

            if (data.status === "Đang giao hàng") {
                const currentPos = [data.latitude, data.longitude];
                
                if (!driverMarker) {
                    driverMarker = L.marker(currentPos, {
                        icon: L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                            iconSize: [25, 41], iconAnchor: [12, 41]
                        })
                    }).addTo(map).bindPopup('🛵 Tài xế đang di chuyển').openPopup();
                } else {
                    driverMarker.setLatLng(currentPos);
                }

                trackPath.push(currentPos);
                polyline.setLatLngs(trackPath);
                map.panTo(currentPos);
            }

            if (data.status === "Đã hoàn thành" && driverMarker) {
                driverMarker.bindPopup('Đã giao hàng thành công!').openPopup();
            }
        });

        //Place order
        function placeOrder() {
            document.getElementById('btnPlaceOrder').disabled = true;
            socket.emit('update_location', { orderId: orderId, latitude: baseLat, longitude: baseLng, status: "Đang chế biến" });
            document.getElementById('btnStartDelivery').disabled = false;
            document.getElementById('driverLog').innerHTML = "<span style='color: #dd6b20;'>Hệ thống: Món ăn đang được chuẩn bị</span>";
        }

        //Start delivery
        function startDelivery() {
            document.getElementById('btnStartDelivery').disabled = true;
            document.getElementById('btnCompleteOrder').disabled = false;
            document.getElementById('driverLog').innerHTML = "<span style='color: #3182ce;'>Tài xế đang giao hàng</span>";

            intervalId = setInterval(() => {
                baseLat -= 0.00025; 
                baseLng += 0.00035;

                socket.emit('update_location', {
                    orderId: orderId,
                    latitude: baseLat,
                    longitude: baseLng,
                    status: "Đang giao hàng"
                });
            }, 3000); 
        }

        //Finish
        function completeOrder() {
            if (intervalId) { clearInterval(intervalId); intervalId = null; }
            document.getElementById('btnCompleteOrder').disabled = true;
            document.getElementById('btnFetchMongo').disabled = false; 
            document.getElementById('driverLog').innerHTML = "<span style='color: #2f855a;'>Đơn hàng đã giao thành công</span>";

            socket.emit('update_location', { orderId: orderId, latitude: baseLat, longitude: baseLng, status: "Đã hoàn thành" });
        }

        //Route history
        function fetchMongoData() {
            fetch(`https://trackingservice-d6bf.onrender.com/api/tracking/history/${orderId}`)
                .then(res => res.json())
                .then(data => {
                    alert(`Dữ liệu MongoDB\n\n` +
                          `• Mã đơn hàng: ${data.orderId}\n` +
                          `• Trạng thái cuối trên Redis: ${data.redisLatestLocation.status}\n` +
                          `• Tổng số điểm định vị: ${data.mongoTotalPointsSaved} tọa độ.`);
                    console.log("Chi tiết lịch sử lộ trình từ MongoDB:", data.mongoRouteHistory);
                })
                .catch(err => alert("Lỗi khi kết nối API cơ sở dữ liệu."));
        }