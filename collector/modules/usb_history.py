import platform
from datetime import datetime, timezone
from typing import Dict, Any, List

def collect_usb_history() -> Dict[str, Any]:
    """
    Collects real historical Windows USB and removable storage artifacts
    directly from HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR.
    Identifies device name, device ID/serial, manufacturer, and hardware ID.
    Does NOT copy files from USB automatically and does NOT fabricate results.
    """
    if platform.system() != "Windows":
        return {
            "status": "unavailable",
            "message": "USBSTOR registry inspection is Windows-specific.",
            "device_count": 0,
            "devices": []
        }

    devices: List[Dict[str, Any]] = []

    try:
        import winreg
        base_key_path = r"SYSTEM\CurrentControlSet\Enum\USBSTOR"
        try:
            usbstor_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, base_key_path)
        except FileNotFoundError:
            return {
                "status": "available",
                "message": "No USB evidence available from the selected Windows sources (USBSTOR key empty or not found).",
                "device_count": 0,
                "devices": []
            }

        num_subkeys = winreg.QueryInfoKey(usbstor_key)[0]
        
        for i in range(num_subkeys):
            try:
                device_type = winreg.EnumKey(usbstor_key, i)
                dev_key = winreg.OpenKey(usbstor_key, device_type)
                num_instances = winreg.QueryInfoKey(dev_key)[0]
                
                for j in range(num_instances):
                    try:
                        instance_id = winreg.EnumKey(dev_key, j)
                        inst_key = winreg.OpenKey(dev_key, instance_id)
                        
                        values: Dict[str, Any] = {}
                        num_values = winreg.QueryInfoKey(inst_key)[1]
                        for k in range(num_values):
                            v_name, v_data, _ = winreg.EnumValue(inst_key, k)
                            values[v_name] = v_data
                            
                        friendly_name = values.get("FriendlyName", values.get("DeviceDesc", device_type))
                        hw_id = values.get("HardwareID", [])
                        if isinstance(hw_id, list):
                            hw_id_str = hw_id[0] if hw_id else "N/A"
                        else:
                            hw_id_str = str(hw_id)

                        # Clean serial
                        serial = instance_id.split("&")[0] if "&" in instance_id else instance_id

                        devices.append({
                            "device_type": device_type,
                            "friendly_name": str(friendly_name),
                            "serial_number": serial,
                            "instance_id": instance_id,
                            "hardware_id": hw_id_str,
                            "registry_path": f"HKLM\\{base_key_path}\\{device_type}\\{instance_id}",
                            "source": "Windows Registry (USBSTOR)"
                        })
                        winreg.CloseKey(inst_key)
                    except Exception:
                        continue
                winreg.CloseKey(dev_key)
            except Exception:
                continue

        winreg.CloseKey(usbstor_key)

        if not devices:
            return {
                "status": "available",
                "message": "No USB evidence available from the selected Windows sources.",
                "device_count": 0,
                "devices": []
            }

        return {
            "status": "available",
            "message": f"Successfully enumerated {len(devices)} physical USB storage artifact(s).",
            "device_count": len(devices),
            "devices": devices,
            "collected_at": datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Error inspecting USBSTOR: {str(e)}",
            "device_count": 0,
            "devices": []
        }
