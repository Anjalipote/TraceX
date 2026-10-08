"""
TraceX Forensic Collector - Safe Network Metadata Module
Collects network interfaces, IP configurations, and active network connections.
CRITICAL: Only collects socket topology (IP, Port, Status, PID).
Does NOT inspect packet payloads, credentials, or session cookies.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List
import logging
import psutil
import socket

logger = logging.getLogger("TraceXCollector.Network")


def collect_network() -> Dict[str, Any]:
    """
    Collects network adapters and active sockets safely.
    """
    # 1. Network Interfaces & Addresses
    interfaces: Dict[str, List[Dict[str, Any]]] = {}
    try:
        addrs = psutil.net_if_addrs()
        for if_name, addr_list in addrs.items():
            if_entries = []
            for addr in addr_list:
                family_name = "AF_INET" if addr.family == socket.AF_INET else (
                    "AF_INET6" if addr.family == socket.AF_INET6 else str(addr.family)
                )
                if addr.family == psutil.AF_LINK:
                    family_name = "MAC"

                if_entries.append({
                    "family": family_name,
                    "address": addr.address,
                    "netmask": addr.netmask or "",
                    "broadcast": addr.broadcast or ""
                })
            interfaces[if_name] = if_entries
    except Exception as e:
        logger.warning(f"Failed to collect network interfaces: {e}")

    # 2. Interface Statistics
    stats: Dict[str, Dict[str, Any]] = {}
    try:
        io_counters = psutil.net_io_counters(pernic=True)
        for if_name, counter in io_counters.items():
            stats[if_name] = {
                "bytes_sent": counter.bytes_sent,
                "bytes_recv": counter.bytes_recv,
                "packets_sent": counter.packets_sent,
                "packets_recv": counter.packets_recv,
                "errin": counter.errin,
                "errout": counter.errout,
                "dropin": counter.dropin,
                "dropout": counter.dropout
            }
    except Exception as e:
        logger.warning(f"Failed to collect network IO counters: {e}")

    # 3. Active Connections (safe socket metadata only)
    connections: List[Dict[str, Any]] = []
    try:
        conns = psutil.net_connections(kind='inet')
        for c in conns:
            laddr = f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else ""
            raddr = f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else ""

            # Resolve process name if PID is available
            proc_name = ""
            if c.pid:
                try:
                    proc_name = psutil.Process(c.pid).name()
                except Exception:
                    proc_name = ""

            connections.append({
                "family": "IPv4" if c.family == socket.AF_INET else "IPv6",
                "type": "TCP" if c.type == socket.SOCK_STREAM else ("UDP" if c.type == socket.SOCK_DGRAM else str(c.type)),
                "local_address": laddr,
                "remote_address": raddr,
                "status": c.status,
                "pid": c.pid,
                "process_name": proc_name
            })
    except (psutil.AccessDenied, PermissionError):
        logger.info("Elevated privileges required for full socket enumeration. Collecting limited sockets.")
    except Exception as e:
        logger.warning(f"Failed to collect network connections: {e}")

    return {
        "interfaces": interfaces,
        "interface_stats": stats,
        "active_connections_count": len(connections),
        "connections": connections,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
