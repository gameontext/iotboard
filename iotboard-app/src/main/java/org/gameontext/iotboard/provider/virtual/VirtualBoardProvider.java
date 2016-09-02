/*******************************************************************************
 * Copyright (c) 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *******************************************************************************/
package org.gameontext.iotboard.provider.virtual;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.Invocation.Builder;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.Response;

import org.gameontext.iotboard.models.DeviceRegistration;
import org.gameontext.iotboard.models.devices.BoardControl;
import org.gameontext.iotboard.provider.BoardProvider;

import com.google.gson.JsonObject;

@ApplicationScoped
public class VirtualBoardProvider implements BoardProvider {

    Map<String, Device> devices = new HashMap<String, Device>();
    
    @Inject
    IoTConfiguration iotConfig;
    
    @Inject
    IoTAppClient appClient;
    
    String deviceId  = null;
    
    @Override
    public String getProviderId() {
        return "VirtualBoardProvider";
    }

    @Override
    public void process(BoardControl msg) {
        System.out.println("Processing control message : " + msg);
    }

    public DeviceRegistrationResponse registerDevice(DeviceRegistration registration) {
        String deviceId = getOrCreateDeviceId(registration);

        Device device = devices.get(deviceId);
        if (device == null) {
            device = new Device();
        }

        String associatedPlayer = device.getAssociatedPlayer();
        if (associatedPlayer != null && !associatedPlayer.equals(registration.getPlayerId())) {
            throw new RuntimeException("Cannot reassign a device");
        }
        
        IoTRegistrationResponse rr = registerIntoIoTF(registration);

        DeviceRegistrationResponse drr = new DeviceRegistrationResponse();
        
        drr.setIotMessagingOrgAndHost(iotConfig.getiotMessagingOrgAndHost());
        drr.setIotMessagingPort(iotConfig.getIotMessagingPort());
        drr.setDeviceId(rr.getDeviceId());
        drr.setDeviceAuthToken(rr.getAuthToken());
        drr.setIotClientId(rr.getClientId());
        drr.setEventTopic("iot-2/type/"+ rr.getTypeId() +"/id/"+ rr.getDeviceId() + "/evt/+/fmt/json");
        drr.setCmdTopic("iot-2/cmd/+/fmt/json");
           
        this.deviceId = drr.getDeviceId();
        return drr;
    }

    private IoTRegistrationResponse registerIntoIoTF(DeviceRegistration registration) {
        Client client = ClientBuilder.newClient().register(RegistrationResponseReader.class);
        
        WebTarget target = client.target(iotConfig.deviceRegistartionUrl());
        Builder requestBuilder = target.request();
//        requestBuilder.header("Content-Type", "application/json");
        
        requestBuilder.header("Authorization", iotConfig.getAuthHeader());
        System.out.println("Registering device with ID " + registration.getDeviceId());
        
        IoTReg iotReg = new IoTReg(registration.getDeviceId(), generateAlphaNum());
        
        Response response = requestBuilder.post(Entity.json(iotReg));
        System.out.println("Got back: " + response.getStatus());
        
        IoTRegistrationResponse rr = response.readEntity(IoTRegistrationResponse.class);
        
        System.out.println("Returned payload: " + rr);
        return rr;
    }

    private String getOrCreateDeviceId(DeviceRegistration registration) {
        String deviceId = registration.getDeviceId();
        if (deviceId == null) {
            deviceId = generateAlphaNum();
        }

        registration.setDeviceId(deviceId);
        return deviceId;
    }
    
    private String generateAlphaNum() {
        return UUID.randomUUID().toString().replaceAll("[^A-Za-z0-9]", "");
    }

    public void trigger(String deviceToHit) {
        System.out.println("Triggering");
        JsonObject event = new JsonObject();
        event.addProperty("sid", "123456789");
        event.addProperty("name", "123456789");
        event.addProperty("gid", "123456789");
        JsonObject data = new JsonObject();
        data.addProperty("light", "reg");
        data.addProperty("status", true);
        event.add("data", data);
        
        System.out.println("JSON: " + event);
        appClient.sendCommand(deviceToHit, "updates", event);

    }

}
