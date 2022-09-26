import { useEffect, useMemo, useRef, useState } from "react";
import { CacheOptions, CacheKey, CacheResult, Nullable } from "./types";
import { ResponseError } from "@/utils";
import { getCacheKeys, getLoadingState, noop } from "@/utils/cache";

const infinity = 5 * 60 * 1000;

class CacheInstanceWrapper<T> {
  wrapped(options: CacheOptions<T>) {
    return useCache<T>(options);
  }
}

type CacheInstance<T> = ReturnType<CacheInstanceWrapper<T>["wrapped"]>;

const caches = new Set<CacheInstance<any>>();

export const useCache = <T>({ defaultValue, ...options }: CacheOptions<T>) => {
  const temp = new Map<CacheKey, CacheResult<T>>();
  const cache = new Map<CacheKey, { time: number; value: CacheResult<T>; maxAge: number }>();
  const refreshers = new Map<CacheKey, () => void>();
  const loadingState = getLoadingState(defaultValue);

  /**
   * 依据key将值存入缓存
   */
  const set = (key: CacheKey, data: CacheResult<T>, maxAge?: number) => {
    temp.delete(key);
    cache.set(key, { time: Date.now(), value: data, maxAge: maxAge ?? options.maxAge ?? infinity });
  };

  /**
   * 通过key从缓存中获取一个值
   *
   * 如果值过时/旧（即已达到其 maxAge），将自动重新获取该值。
   * 在重新获取期间，将返回旧值。
   */
  const get = (key: CacheKey): CacheResult<T> | undefined => {
    const current = cache.get(key);
    const now = Date.now();
    const doDispose = current ? current.time + current.maxAge <= now : false;

    if (doDispose && current) {
      cache.delete(key);
      // eslint-disable-next-line no-console
      console.log("disposing", { key, current });

      if (!current.value.error) {
        temp.set(key, current.value);

        // Refresh data that has passed its maxAge automatically:
        if (refreshers.has(key)) {
          refreshers.get(key)?.();
        }
      }
    }

    return cache.get(key)?.value ?? current?.value;
  };

  /**
   * 按key获取缓存中的值
   *
   * 如果数据过时，则不会重新获取。
   */
  const peek = (key?: CacheKey): CacheResult<T> | undefined => {
    if (!key) {
      return;
    }

    const current = cache.get(key);

    if (current && current.time + current.maxAge > Date.now()) {
      return current.value;
    }
  };

  const reset = () => {
    temp.clear();
    cache.clear();
    refreshers.clear();
  };

  /**
   * 通过key检查缓存中是否存在某个值
   */
  const has = (key: CacheKey): boolean => {
    return cache.has(key);
  };

  /**
   * 从缓存中删除一个值。
   */
  const del = (key: CacheKey): boolean => {
    temp.delete(key);

    return cache.delete(key);
  };

  /**
   * 删除缓存中具有以给定前缀开头的键的所有值
   */
  const delByPrefix = (prefixKey: string | CacheKey): boolean => {
    let deleted = 0;

    cache.forEach((_v, key) => {
      if (key === prefixKey) {
        deleted |= Number(del(key));

        return;
      }

      const keys = getCacheKeys(key);

      if (keys.some((key) => typeof key === "string" && key.startsWith(prefixKey.toString()))) {
        deleted |= Number(del(key));
      }
    });

    return Boolean(deleted);
  };

  /**
   * @description
   * @param {Nullable<CacheKey>} key
   * @param {() => Promise<T>} fetch
   * @return {*}
   */
  const init = (key: Nullable<CacheKey>, fetch: () => Promise<T>) => {
    if (typeof key === "undefined" || key === null) {
      return { ...loadingState, refresh: noop };
    }

    const initrd = useRef(false);

    const [data, setData] = useState<T>();
    const [error, setError] = useState<ResponseError>();

    const refresh = () => {
      // console.log("refresh");
      // set(key, { loading, data: defaultValue });
      set(key, { loading: true, data: defaultValue, state: "loading" });
      fetch()
        .then((data) => {
          setData(data);
          // set(key, { loading: false, data, state: "success" });
        })
        .catch((error) => {
          setError(error);
          set(key, { loading: false, error, state: "error" });
        });
    };

    refreshers.set(key, refresh);

    const finalValue = useMemo(() => {
      return get(key);
    }, [data, error]);

    /**
     * @description 初始化数据
     * value: 当前数据集合中是否存在，存在则直接使用旧值
     * initrd: 防止重复请求数据
     */
    useEffect(() => {
      if (!has(key) && !initrd.current) {
        initrd.current = true;
        refresh();
      }
    }, []);

    return {
      ...finalValue,
      refresh,
    };
  };

  const createCache = { init, set, get, reset, has, del, delByPrefix, peek };

  caches.add(createCache);

  return createCache;
};
