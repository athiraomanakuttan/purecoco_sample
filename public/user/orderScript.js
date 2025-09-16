// ---------------- Cross-tab payment lock for repayment -----------------
const REPAY_LOCK_STALE_MS = 12 * 1000
const repayTabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const repayUserId = (window.__LOCK_USER_ID__ || window.__USER_ID__ || 'anonymous')
const repayLockKey = `checkoutLock:${repayUserId}`
const repayHeartbeatKey = `checkoutLockHeartbeat:${repayUserId}`
const repayBC = ('BroadcastChannel' in window) ? new BroadcastChannel('checkout-lock') : null

function repayGetLock(){ try { return JSON.parse(localStorage.getItem(repayLockKey)) } catch(_) { return null } }
function repayIsLockStale(){ const last = Number(localStorage.getItem(repayHeartbeatKey) || 0); return Date.now() - last > REPAY_LOCK_STALE_MS }
function repayClearStale(){ const l = repayGetLock(); if(l && repayIsLockStale()){ localStorage.removeItem(repayLockKey); localStorage.removeItem(repayHeartbeatKey) } }
function repayIsLockedByOther(){ const l = repayGetLock(); if(!l) return false; if(repayIsLockStale()) return false; return l.tabId !== repayTabId }
function repayAcquireLock(){ const l = repayGetLock(); if(l && !repayIsLockStale() && l.tabId !== repayTabId) return false; localStorage.setItem(repayLockKey, JSON.stringify({ tabId: repayTabId, ts: Date.now() })); localStorage.setItem(repayHeartbeatKey, String(Date.now())); repayStartHeartbeat(); repayBC && repayBC.postMessage({ type:'locked', userId: repayUserId, tabId: repayTabId }); return true }
function repayReleaseLock(){ const l = repayGetLock(); if(l && l.tabId === repayTabId){ localStorage.removeItem(repayLockKey); localStorage.removeItem(repayHeartbeatKey); repayStopHeartbeat(); repayBC && repayBC.postMessage({ type:'released', userId: repayUserId, tabId: repayTabId }); } }
let repayHeartbeatTimer = null
function repayStartHeartbeat(){ repayStopHeartbeat(); repayHeartbeatTimer = setInterval(()=>{ const l = repayGetLock(); if(l && l.tabId === repayTabId){ localStorage.setItem(repayHeartbeatKey, String(Date.now())) } else { repayStopHeartbeat() } }, 20*1000) }
function repayStopHeartbeat(){ if(repayHeartbeatTimer){ clearInterval(repayHeartbeatTimer); repayHeartbeatTimer = null } }

async function paynow(orderId)
{
    repayClearStale()
    if(repayIsLockedByOther()){
        return typeof errorNotification === 'function' ? errorNotification('Payment is already in process in another tab.') : alert('Payment is already in process in another tab.')
    }
    if(!repayAcquireLock()){
        return typeof errorNotification === 'function' ? errorNotification('Unable to start payment. Try again in a moment.') : alert('Unable to start payment. Try again in a moment.')
    }
    fetch('/repayment-razorpay',{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify({orderId})
    }).then((res)=>{
        console.log("responce",res)

        if(res.redirected)
            window.location.href= res.url;
        else if(!res.ok) {
            if(res.status === 409) {
                // Server-side payment lock conflict
                repayReleaseLock()
                return typeof errorNotification === 'function' ? errorNotification('Payment is already in progress in another tab or window.') : alert('Payment is already in progress in another tab or window.')
            }
            return res.json().then(err => { throw new Error(err.message); });
        }
        return res.json();
    }).then((data)=>{
            
            if (data.orderID) {
                const options = {
                    "key": "rzp_test_1CXfduMW9euDd9",
                    "amount": data.totalPrice * 100,
                    "currency": "INR",
                    "name": "PURE QOQO",
                    "order_id": data.orderID,
                    "prefill": {
                        "name": "",
                        "email": "",
                        "contact": ""
                    },
                    "notes": {
                        "address": "Razorpay Corporate Office"
                    },
                    "theme": {
                        "color": "#6351CE"
                    },
                    "handler": function (response) {
                        // Handle successful payment here
                        fetch('/retry-payment-success',{
                            method:'POST',
                            headers:{'Content-Type':'application/json'},
                            body: JSON.stringify({orderId})
                        }).then((res)=>{
                            if(res.ok)
                            {
                                repayReleaseLock()
                                Swal.fire({
                                    position: "center",
                                    icon: "success",
                                    title: "Order Placed Sucessfully",
                                    showConfirmButton: false,
                                    timer: 3000
                                  });
                                  window.location.href='/orders'
                            }
                        })
                    },
                    "modal": {
                        "ondismiss": function () {
                            console.log("Payment failed or was dismissed.");
                            repayReleaseLock()
                        }
                    }
                };

                const rzp1 = new Razorpay(options);
                rzp1.on('payment.failed', async function (response){
                  repayReleaseLock()
                  Swal.fire({ icon:'error', text:'Payment failed. You can try again.' })
                })
                rzp1.open();
            }else {
                            throw new Error("Order ID not received");
                        }
    }).catch((err)=> { console.log(err); repayReleaseLock(); typeof errorNotification==='function' && errorNotification(err.message) })

// Release server-side lock on page unload
window.addEventListener('beforeunload', ()=>{
    repayReleaseLock()
    fetch('/release-payment-lock', { method: 'POST' }).catch(() => {})
})
}